package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/grafana/sobek"
	"github.com/surrealdb/surrealdb.go/pkg/models"
)

// Bot-related types matching bots/bot.d.ts:1-17
type Move string

const (
	MoveCooperate Move = "C"
	MoveDefect    Move = "D"
)

type Match struct {
	You      Move `json:"you"`
	Opponent Move `json:"opponent"`
}

type State struct {
	History []Match         `json:"history"`
	Memory  json.RawMessage `json:"memory"`
}

type DBBot struct {
	ID         any    `json:"id" cbor:"id"`
	CodeHash   string `json:"codeHash" cbor:"codeHash"`
	LatestCode string `json:"latestCode" cbor:"latestCode"`
	Name       string `json:"name" cbor:"name"`
}

func (b DBBot) RecordID() *models.RecordID {
	if b.ID == nil {
		return nil
	}
	switch v := b.ID.(type) {
	case *models.RecordID:
		return v
	case models.RecordID:
		return &v
	case string:
		rid, err := models.ParseRecordID(v)
		if err != nil {
			log.Printf("failed to parse record id %q: %v", v, err)
			return nil
		}
		return rid
	case map[string]any:
		tb, _ := v["tb"].(string)
		if tb == "" {
			tb, _ = v["table"].(string)
		}
		if tb == "" {
			tb, _ = v["Table"].(string)
		}
		idVal := v["id"]
		if idVal == nil {
			idVal = v["ID"]
		}
		if tb != "" && idVal != nil {
			return &models.RecordID{Table: tb, ID: idVal}
		}
		if s, ok := v["id"].(string); ok {
			if rid, err := models.ParseRecordID(s); err == nil {
				return rid
			}
		}
		return nil
	default:
		bts, _ := json.Marshal(v)
		var s string
		if json.Unmarshal(bts, &s) == nil {
			if rid, err := models.ParseRecordID(s); err == nil {
				return rid
			}
		}
		log.Printf("unknown ID type %T: %v", v, v)
		return nil
	}
}

var (
	selectBotsQuery = MustReadQuery("selectBots")
	createBotQuery  = MustReadQuery("createBot")
)

func init() {
	if strings.Contains(selectBotsQuery, "SELECT codeHash") {
		selectBotsQuery = strings.ReplaceAll(selectBotsQuery, "SELECT codeHash, latestCode, name", "SELECT id, codeHash, latestCode, name")
	}
}

func transpile(code string) (string, error) {
	result := api.Transform(code, api.TransformOptions{
		Loader: api.LoaderTS,
	})
	if len(result.Errors) > 0 {
		var msgs []string
		for _, e := range result.Errors {
			msgs = append(msgs, e.Text)
		}
		return "", fmt.Errorf("transpile failed: %s", strings.Join(msgs, "; "))
	}
	return string(result.Code), nil
}

type BotRunner struct {
	vm  *sobek.Runtime
	fn  sobek.Callable
	bot DBBot
}

func NewBotRunner(bot DBBot) (*BotRunner, error) {
	vm := sobek.New()
	vm.SetFieldNameMapper(sobek.TagFieldNameMapper("json", true))
	transformed := (bot.LatestCode)
	
	p, err := sobek.Compile(bot.Name, transformed, true)
	if err != nil {
		return nil, fmt.Errorf("failed to compile bot script %s: %w (code excerpt: %.200s)", bot.Name, err, transformed)
	}
	
	if _, err := vm.RunProgram(p); err != nil {
		return nil, fmt.Errorf("failed to run bot script %s: %w (code excerpt: %.200s)", bot.Name, err, transformed)
	}
	val := vm.Get("__bot")
	if val == nil || sobek.IsNull(val) || sobek.IsUndefined(val) {
		for _, name := range []string{"bot", "index_default", "default"} {
			if v := vm.Get(name); v != nil && !sobek.IsNull(v) && !sobek.IsUndefined(v) {
				val = v
				break
			}
		}
	}
	if val == nil || sobek.IsNull(val) || sobek.IsUndefined(val) {
		return nil, fmt.Errorf("bot %s did not expose a function (value is null/undefined)", bot.Name)
	}
	fn, ok := sobek.AssertFunction(val)
	if !ok {
		return nil, fmt.Errorf("bot %s export is not a function", bot.Name)
	}
	return &BotRunner{vm: vm, fn: fn, bot: bot}, nil
}

func (br *BotRunner) Close() {}

func (br *BotRunner) Call(state State) (Move, json.RawMessage, error) {
	// sobek handles interrupt? Set timeout via vm.Interrupt channel
	// Use ToValue with field mapper already set
	stateVal := br.vm.ToValue(state)
	res, err := br.fn(sobek.Undefined(), stateVal)
	if err != nil {
		return "", nil, fmt.Errorf("bot %s call failed: %w", br.bot.Name, err)
	}
	exported := res.Export()
	// exported should be []interface{} with 2 elements
	arr, ok := exported.([]interface{})
	if !ok {
		// try to handle via generic export to slice
		// sobek may export as []any but sometimes as sobek.Value array? fallback to JSON via stringify
		// Use JS JSON.stringify and reparse in Go as fallback
		br.vm.Set("__res", res)
		jsonVal, err := br.vm.RunString("JSON.stringify(__res)")
		if err != nil {
			return "", nil, fmt.Errorf("failed to stringify result: %w", err)
		}
		jsonStr := jsonVal.String()
		var raw [2]json.RawMessage
		if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
			return "", nil, fmt.Errorf("failed to unmarshal bot result %q: %w (exported %T %v)", jsonStr, err, exported, exported)
		}
		var moveStr string
		if err := json.Unmarshal(raw[0], &moveStr); err != nil {
			return "", nil, fmt.Errorf("move not a string %s: %w", string(raw[0]), err)
		}
		move := Move(moveStr)
		if move != MoveCooperate && move != MoveDefect {
			return "", nil, fmt.Errorf("invalid move %q from bot %s", moveStr, br.bot.Name)
		}
		memory := raw[1]
		if len(memory) == 0 {
			memory = json.RawMessage("null")
		}
		return move, memory, nil
	}
	if len(arr) != 2 {
		return "", nil, fmt.Errorf("bot %s returned %d elements, expected 2", br.bot.Name, len(arr))
	}
	moveRaw, ok := arr[0].(string)
	if !ok {
		// coerce via json
		b, _ := json.Marshal(arr[0])
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return "", nil, fmt.Errorf("move not a string %v: %w", arr[0], err)
		}
		moveRaw = s
	}
	move := Move(moveRaw)
	if move != MoveCooperate && move != MoveDefect {
		return "", nil, fmt.Errorf("invalid move %q from bot %s", moveRaw, br.bot.Name)
	}
	// memory is second element, could be nil
	var memRaw json.RawMessage
	if arr[1] == nil {
		memRaw = json.RawMessage("null")
	} else {
		b, err := json.Marshal(arr[1])
		if err != nil {
			return "", nil, fmt.Errorf("failed to marshal memory: %w", err)
		}
		memRaw = json.RawMessage(b)
	}
	if len(memRaw) == 0 {
		memRaw = json.RawMessage("null")
	}
	return move, memRaw, nil
}

func ensureBots() error {
	_, err := Query[any](selectBotsQuery, nil)
	if err == nil {
		return nil
	}
	if !strings.Contains(err.Error(), "Not enough bots") && !strings.Contains(err.Error(), "Not enough") {
		log.Printf("selectBots failed (will attempt to create bots): %v", err)
	}
	fmt.Println("Not enough bots, creating default bots...")
	botsToCreate := []struct {
		name string
		path string
	}{
		{"alwaysCooperate", "../bots/alwaysCooperate.ts"},
		{"alwaysDefect", "../bots/alwaysDefect.ts"},
	}
	for _, b := range botsToCreate {
		srcBytes, err := os.ReadFile(b.path)
		if err != nil {
			return fmt.Errorf("read bot source %s: %w", b.path, err)
		}
		source := string(srcBytes)
		transpiled, err := transpile(source)
		if err != nil {
			return fmt.Errorf("transpile %s: %w", b.name, err)
		}
		if _, err := Query[any](createBotQuery, map[string]any{
			"name":       b.name,
			"source":     source,
			"transpiled": transpiled,
		}); err != nil {
			return fmt.Errorf("create bot %s: %w", b.name, err)
		}
		fmt.Printf("created bot %s\n", b.name)
	}
	return nil
}

func battle() error {
	fmt.Println("Battling...")
	if err := ensureBots(); err != nil {
		return fmt.Errorf("ensureBots: %w", err)
	}
	results, err := Query[any](selectBotsQuery, nil)
	if err != nil {
		return fmt.Errorf("selectBots query failed: %w", err)
	}
	if len(results) == 0 {
		return fmt.Errorf("no results from selectBots")
	}
	last := results[len(results)-1]
	if last.Result == nil {
		return fmt.Errorf("no bots returned")
	}
	data, err := json.Marshal(last.Result)
	if err != nil {
		return fmt.Errorf("marshal bots result: %w", err)
	}
	var bots []DBBot
	if err := json.Unmarshal(data, &bots); err != nil {
		return fmt.Errorf("unmarshal bots %s: %w", string(data), err)
	}
	if len(bots) != 2 {
		return fmt.Errorf("expected 2 bots, got %d: %s", len(bots), string(data))
	}
	fmt.Printf("selected bots: %s vs %s\n", bots[0].Name, bots[1].Name)
	if len(bots[1].LatestCode) > 200 {
		fmt.Printf("bot[1] code excerpt: %.200s ...\n", bots[1].LatestCode)
	} else {
		fmt.Printf("bot[1] code: %s\n", bots[1].LatestCode)
	}
	runners := make([]*BotRunner, 2)
	for i, b := range bots {
		r, err := NewBotRunner(b)
		if err != nil {
			for _, pr := range runners[:i] {
				if pr != nil {
					pr.Close()
				}
			}
			return fmt.Errorf("create runner for %s: %w", b.Name, err)
		}
		runners[i] = r
		defer r.Close()
	}
	const rounds = 10
	type MovePair = [2]Move
	defaultMemory := json.RawMessage("null")
	defaultState := State{
		History: []Match{},
		Memory:  defaultMemory,
	}
	states := [2]State{
		{History: append([]Match(nil), defaultState.History...), Memory: append(json.RawMessage(nil), defaultState.Memory...)},
		{History: append([]Match(nil), defaultState.History...), Memory: append(json.RawMessage(nil), defaultState.Memory...)},
	}
	for i := range states {
		if len(states[i].Memory) == 0 {
			states[i].Memory = json.RawMessage("null")
		}
	}
	var history [][2]int
	var moveHistory []MovePair
	moveToInt := func(m Move) int {
		if m == MoveCooperate {
			return 0
		}
		return 1
	}
	for r := 0; r < rounds; r++ {
		moves := [2]Move{}
		newMemories := [2]json.RawMessage{}
		for j, runner := range runners {
			state := states[j]
			move, mem, err := runner.Call(state)
			if err != nil {
				return fmt.Errorf("round %d bot %s call failed: %w (state=%+v)", r, runner.bot.Name, err, state)
			}
			moves[j] = move
			newMemories[j] = mem
			fmt.Printf("round %d bot %d (%s) move=%s memory=%s\n", r, j, runner.bot.Name, move, string(mem))
		}
		for j := range states {
			states[j].Memory = newMemories[j]
		}
		states[0].History = append(states[0].History, Match{You: moves[0], Opponent: moves[1]})
		states[1].History = append(states[1].History, Match{You: moves[1], Opponent: moves[0]})
		moveHistory = append(moveHistory, MovePair{moves[0], moves[1]})
		history = append(history, [2]int{moveToInt(moves[0]), moveToInt(moves[1])})
	}
	fmt.Printf("battle complete history: %v\n", moveHistory)
	fmt.Printf("DB rounds: %v\n", history)
	var botIDs []*models.RecordID
	for _, b := range bots {
		rid := b.RecordID()
		if rid == nil {
			return fmt.Errorf("bot %s has no id (%v)", b.Name, b.ID)
		}
		botIDs = append(botIDs, rid)
	}
	if len(botIDs) != 2 {
		return fmt.Errorf("not enough bot IDs")
	}
	battleSQL := "CREATE battle CONTENT {bots: [$bot1, $bot2], rounds: $rounds}"
	vars := map[string]any{
		"bot1":   *botIDs[0],
		"bot2":   *botIDs[1],
		"rounds": history,
	}
	res, err := Query[any](battleSQL, vars)
	if err != nil {
		return fmt.Errorf("failed to create battle: %w", err)
	}
	fmt.Printf("battle stored: %+v\n", res)
	if len(res) > 0 && res[0].Result != nil {
		b, _ := json.Marshal(res[0].Result)
		fmt.Printf("battle result: %s\n", string(b))
	}
	return nil
}

func main() {
	fmt.Println("starting tournament engine")
	if err := battle(); err != nil {
		log.Printf("initial battle failed: %v", err)
	}
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		if err := battle(); err != nil {
			log.Printf("battle failed: %v", err)
		}
	}
}

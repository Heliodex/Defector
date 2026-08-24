# PLANv1 — Game Theory Tournament (v1 Spec & Implementation)

> Implementation-ready spec for v1. Reuses the Power Tools SvelteKit base (familiar stack: SvelteKit + SurrealDB + Hack Club OAuth + Lapse). No fluff — only what ships in 2 weeks.

## 1. Stack (reused from Power Tools)

*   **App:** Svelte 5 (runes, `experimental.async`), SvelteKit `next` with `experimental.remoteFunctions: true`, Vite 8, Tailwind 4, `adapter-node`
*   **DB:** SurrealDB 2 (embedded via `surreal` binary, `ws://localhost:8002`, `surrealdb` JS client, `init.surql` migrations)
*   **Auth:** Hack Club OAuth (OIDC `openid profile email`) via `src/lib/server/auth.ts:22`, session cookie `session` (30d, `src/lib/server/init.surql:32`), `hooks.server.ts:81` guard
*   **Time tracking:** Lapse OAuth PKCE (`src/lib/server/auth.ts:254`), `GET /lapse` + `fetchLapseTimelapses()` (`src/routes/(main)/submit/submit.remote.ts:173`), `LAPSE_TIMELAPSE_SINCE` env
*   **Validation:** `arktype` + Standard Schema, `sharp` for images (kept for hour submissions), `Bun` for `CryptoHasher`/`Transpiler`
*   **Analytics:** Plausible self-hosted

**Reuse:** keep `hooks.server.ts:1` (init + coloured logger), `db.ts:10` retry wrapper, `auth.ts:22` all OAuth helpers, `Head.svelte:1`/`layout.css:1`/`config.ts:1`. Change only `config.ts:1` `programmeName`/`repoName`.

## 2. Game Spec

**Iterated Prisoner's Dilemma (IPD), 100 rounds, fixed, no noise.**

Payoff (classic 3/2/1/0, `T > R > P > S`, `2R > T+S`):

| | Opp C | Opp D |
|---|:-:|:-:|
| You C | 2,2 | 0,3 |
| You D | 3,0 | 1,1 |

*   **Match:** 100 rounds. History fully visible each round. No random noise.
*   **Score:** sum of payoffs per bot across 100 rounds. `scoreA > scoreB` ⇒ `winner = A`, tie ⇒ `null`.
*   **Tournament:** **live continuous**. One ranked 1v1 battle every `BATTLE_INTERVAL_MS` (env, **default 10s**). ~8.6k battles/day, ~120k/14d at 10s; revert to 60s via env if load high. Each tick picks one pair, runs 200 `runBot` calls, updates Elo, writes one `battle` row.
*   **Elo:** starter `1000`, `K=32`, `Ea = 1/(1+10^((Rb-Ra)/400))`, `Rb` likewise. Rank leaderboard by `elo DESC, wins DESC`. New bots start 1000. No reset during 2 weeks.

## 3. Bot API (`test.d.ts:1` — canonical)

```ts
type Move = "C" | "D"
type Match = { you: Move; opponent: Move }
type Memory = unknown
type State = { history: Match[]; memory: Memory }
export type Bot = (state: State) => [Move, Memory]
```

Purity contract: same `State` ⇒ same output. No closure state, no globals, no I/O. Runner threads `memory` round-to-round: `state.memory` on entry is `previousReturn[1]`, initial `{}`.

**Examples:**

```ts
// always cooperate
export default function bot({ memory }: State): [Move, Memory] { return ["C", memory] }
// tit-for-tat (history only)
export default function bot({ history, memory }: State): [Move, Memory] {
  if (history.length === 0) return ["C", memory]
  return [history[history.length - 1].opponent, memory]
}
// stateful — count opponent defections
export default function bot({ history, memory }: State): [Move, Memory] {
  const defects = (memory.defects ?? 0) as number
  const lastOpp = history.at(-1)?.opponent
  const next = { ...memory, defects: defects + (lastOpp === "D" ? 1 : 0) }
  return [next.defects > 3 ? "D" : "C", next]
}
```

**Languages:** JS or TS. TS transpiled via `Bun.Transpiler` in sandbox before execution.

**Constraints:** 10ms/move, ~1MB, no `fetch`/`process`/`fs`/`import`/`eval`/`Function`. Invalid moves/timeouts in a match ⇒ forfeit.

## 4. Data Model

See init.surql in the `engine` directory. This is to be merged into the `src/lib/server/init.surql` for the site.

Battery: `active=true` counts toward live pool, max **3 per user** (enforced in app, not Surreal index). All others remain in battery (`active=false`) — toggle via `my-bots`.

**Live leaderboard:**

*   `src/routes/(any)/leaderboard/leaderboard.remote.ts` — `query.live` on `SELECT * FROM bot WHERE active ORDER BY elo DESC` and `SELECT * FROM battle ORDER BY created DESC LIMIT 50`, surfaced via `leaderboard.remote.ts`. Client shows `connected` flag, fallback polling `refresh()` every 10s.
*   `src/routes/(any)/battle/[id]/+page.svelte` — replay 100 moves, `rounds` expandable.
*   `src/routes/(any)/bot/[id]/+page.svelte` — Elo sparkline from battles, win rate, code preview.

## 5. Hours & Prizes (decoupled from ladder)

*   **Ladder submission** (`/(main)/submit-bot`): no hour gate. Form: `name, description, code` (paste) + `codeUrl` optional + 3-active toggle. Validates via `arktype` like `submit.remote.ts:31`, stores `codeHash`.
*   **Hour submission** (`/(main)/hours`): reuse `fetchLapseTimelapses` + fixed `src/routes/(main)/submit/+page.svelte:11` pattern (`value() ?? []` + no `bind:group`). User selects timelapses → creates `hourSubmission` with `status=pending`. Reviewable anytime during 2 weeks (not just at end). Admin page lists pending, approves → records `hours = sum(duration)/3600`, issues participation reward.
*   **Prizes:** participation **$3–4/hr** (stickers/small grants), ladder **top 3 users by Elo at freeze** win video game grants (Steam etc, ~$30–60 each). Example budget 30 users×4hr×$3.5 + $120 top-3 ≈ $540.

## 6. Site Routes (new vs reused)

Reused: `+layout.svelte`, `+layout.server.ts` guard, `/`, `/guide` (rewrite), `/home`, `/admin`, `/auth`, `/lapse`.

New:

*   `/(main)/submit-bot` — `bot.remote.ts` `form`
*   `/(main)/my-bots` — list + activate/deactivate (max 3)
*   `/(main)/hours` — Lapse hour submission (anytime)
*   `/(any)/leaderboard` — live `query.live` (public)
*   `/(any)/bot/[id]` — `query` by id
*   `/(any)/battle/[id]` — `query` by id
*   `/(main)/admin` — extend with bot/battle/hour tables

Config: `src/lib/assets/config.ts:1` → new `programmeName` (name TBD) + `repoName`.

## 7. Implementation Order

1.  `src/lib/server/init.surql:6` — add `bot`/`battle`/`hourSubmission` tables.
2.  `tournament/sandbox.ts` + `tournament/runner.ts` + `tournament/server.ts` + `tournament/battle.test.ts` (4 bots: always-C/D/TFT/random).
3.  `src/routes/(main)/submit-bot/bot.remote.ts` + `src/lib/server/bot/*.surql` (create, list, toggle active).
4.  `src/routes/(main)/hours/hours.remote.ts` + `hourSubmission` surql (reuse Lapse logic).
5.  `src/routes/(any)/leaderboard/leaderboard.remote.ts` — `query.live` + fallback polling.
6.  `src/lib/server/tournament/scheduler.ts` + wire `hooks.server.ts:14` `init` + `BATTLE_INTERVAL_MS=10000`.
7.  UI pages: `my-bots`, `leaderboard`, `bot/[id]`, `battle/[id]`, `hours`, admin extension.
8.  guide rewrite + landing copy + rename `config.ts:1`.

## 8. Env

*   Existing: `ADMIN_EMAIL`, `HACKCLUB_*`, `LAPSE_*`, `LAPSE_TIMELAPSE_SINCE`

## 9. Verification

*   `bun run build` + `svelte-check` — no new errors (pre-existing `db.ts:3 Query` warning ok).
*   Manual: paste TFT bot → appears in `my-bots` → next 10s tick creates `battle` row → leaderboard Elo shifts → `/battle/[id]` replay shows 100 moves → `/hours` Lapse select count fixed (no `bind:group` bug) → live `connected` indicator toggles.

## 10. Out of Scope (v2)

*   Python/other languages, additional games (Stag Hunt etc), Elo-gated matchmaking, anti-plagiarism beyond `codeHash`, real-time spectator websockets beyond `query.live`, prize automation.

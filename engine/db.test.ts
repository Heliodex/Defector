import { afterAll, beforeAll, expect, test } from "bun:test"
import { createWasmEngines } from "@surrealdb/wasm"
import { Surreal, Table } from "surrealdb"
import initQuery from "../src/lib/server/init.surql?raw"
import { type DBBot, runBattle, simulateBattle } from "./runner"
import selectBotsQuery from "./selectBots.surql?raw"

/**
 * End-to-end tournament test: spins up an in-memory SurrealDB (WASM engine), applies the real schema, loads every sample bot from ./bots, then lets selectBots.surql pick two of them at random and plays a battle — exactly like the live tournament does.
 */

// In-memory database, connected fresh per test file run
const db = new Surreal({
	codecOptions: { useNativeDates: true },
	engines: { ...createWasmEngines() },
})

beforeAll(async () => {
	await db.connect("mem://", { namespace: "main", database: "main" })
	await db.query(initQuery)
})

afterAll(async () => {
	await db.close()
})

/** All sample bots (skipping the .d.ts type file), transpiled like the site does. */
const botFiles = (
	await Array.fromAsync(new Bun.Glob("*.ts").scan({ cwd: "./bots" }))
).filter(file => !file.endsWith(".d.ts"))

const loaded = await Promise.all(
	botFiles.map(async file => {
		const source = await Bun.file(`./bots/${file}`).text()
		return {
			name: file.replace(/\.ts$/, ""),
			source,
			transpiled: new Bun.Transpiler({ loader: "ts" }).transformSync(
				source
			),
		}
	})
)

let bots: DBBot[] = []

test("adds all sample bots to the database", async () => {
	for (const bot of loaded) {
		await db.create(new Table("bot")).content({
			name: bot.name,
			description: "",
			code: [{ source: bot.source, transpiled: bot.transpiled }],
			active: true,
		})
	}

	bots = (await db.select(new Table("bot"))).map(bot => ({
		id: bot.id as DBBot["id"],
		codeHash: bot.codeHash as string,
		latestCode: bot.latestCode as string,
		name: bot.name as string,
	}))

	expect(bots).toHaveLength(loaded.length)
	expect(bots.every(bot => bot.codeHash && bot.latestCode)).toBe(true)
})

test("selectBots picks two distinct weighted bots from the database", async () => {
	const picked = (await db.query<[DBBot, DBBot][]>(selectBotsQuery)).at(-1)
	if (!picked) throw new Error("selectBots returned no bots")

	expect(picked).toHaveLength(2)
	// Both picks must be real, distinct, active bots we just inserted
	const ids = picked.map(bot => String(bot.id))
	expect(new Set(ids).size).toBe(2)
	const allIds = new Set(bots.map(bot => String(bot.id)))
	expect(ids.every(id => allIds.has(id))).toBe(true)
	// ...with the computed fields the engine needs
	expect(picked.every(bot => bot.latestCode && bot.codeHash)).toBe(true)
})

test("the picked bots battle and the battle persists with computed scores", async () => {
	const picked = (await db.query<[DBBot, DBBot][]>(selectBotsQuery)).at(-1)
	if (!picked) throw new Error("selectBots returned no bots")

	expect(picked).toHaveLength(2)

	// The sample pool includes deliberate saboteurs (infinite loops, invalid
	// returns, stack bombs…), so a random pair may legitimately fail — and an
	// interrupted QuickJS VM can even throw while being disposed. What must
	// never happen is an unbounded failure: either the battle runs, or the
	// bot's error is recorded/contained.
	let result: Awaited<ReturnType<typeof simulateBattle>> | undefined
	try {
		result = await simulateBattle(picked)
	} catch (error) {
		expect((error as Error).message).toMatch(
			/maximum (execution time|stack size|memory limit)|bot error|Aborted/
		)
	}

	if (result) {
		const { rounds, errors } = result
		if (errors.every(error => error === undefined)) {
			// Clean pair: battles always run at least 100 rounds
			expect(rounds.length).toBeGreaterThanOrEqual(100)
		} else {
			// Saboteur caught: the battle stops at the first bad move
			expect(rounds.length).toBeLessThan(100)
			expect(errors.some(error => error !== undefined)).toBe(true)
		}
	}

	// runBattle persists the battle row (only if the battle actually ran);
	// scoring comes from computed fields
	if (result) await runBattle(db, picked)

	const battles = await db.select(new Table("battle"))
	expect(battles).toHaveLength(result ? 1 : 0)
	if (!result) return

	const battle = battles[0]
	if (!battle) throw new Error("No battle row found")

	expect(battle.botIds).toEqual(picked.map(bot => bot.id.id))
	expect(battle.scores).toHaveLength(2)
})

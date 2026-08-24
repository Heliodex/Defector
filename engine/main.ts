import { readdirSync } from "node:fs"
import quickjsVariant from "@jitl/quickjs-ng-wasmfile-release-sync"
import { loadQuickJs } from "@sebastianwessel/quickjs"
import { type RecordId, Surreal } from "surrealdb"
import type { Memory, Move, State } from "./bots/bot"
import commitBattleQuery from "./commitBattle.surql?raw"
import createBotQuery from "./createBot.surql?raw"
import initQuery from "./init.surql?raw"
import selectBotsQuery from "./selectBots.surql?raw"

console.log("starting")

Bun.spawn(
	[
		"surreal",
		"start",
		"-u=root",
		"-p=root",
		"-b=127.0.0.1:8003",
		"surrealkv://data/surreal",
	],
	{ cwd: ".", stdout: "pipe", stderr: "pipe" }
)

console.log("started")

const db = new Surreal()
const url = "ws://localhost:8003"

async function reconnect() {
	for (let attempt = 0; ; attempt++)
		try {
			await db.close() // doesn't do anything if not connected
			console.log("connecting to database")
			await db.connect(url, {
				namespace: "main",
				database: "main",
				authentication: {
					username: "root", // security B)
					password: "root",
				},
			})

			console.log("reloaded", (await db.version()).version)

			break
		} catch (err) {
			const e = err as Error

			console.error("Failed to connect to database:", e.message)

			if (attempt === 4)
				console.log("Multiple connection attempts failed")

			console.log("Retrying connection in 1 second...")
			await Bun.sleep(1000)
		}

	await db.query(initQuery)
}

await reconnect()

async function transpile(code: string) {
	// new Bun.Transpiler({ loader: "ts" }).transformSync(code)
	const out = await Bun.build({
		entrypoints: ["index.ts"],
		files: {
			"index.ts": code,
		},
	})
	if (!out.success) throw new Error("Compilation failed")

	const output = out.outputs[0]
	if (!output) throw new Error("No output")

	return await output.text()
}

console.log("connected")

// load all bots from the bots directory
const dir = "./bots"
const files = readdirSync(dir)

for (const file of files) {
	if (file.endsWith(".d.ts")) continue

	const botName = file.replace(/\.ts$/, "")
	const botCode = await Bun.file(`${dir}/${file}`).text()

	await db.query(createBotQuery, {
		name: botName,
		source: botCode,
		transpiled: await transpile(botCode),
	})
}

type DBBot = {
	id: RecordId<"bot">
	codeHash: string
	latestCode: string
	name: string
}

const rounds = 10
const timeout = 100 // ms

const { runSandboxed } = await loadQuickJs(quickjsVariant)

const callBot = (bot: DBBot, state: State): Promise<[Move, Memory]> =>
	runSandboxed(
		async ({ evalCode }) => {
			const result = await evalCode(
				`${bot.latestCode.replace(/export \{[\s\S]*?\};?\s*$/, "")}\nexport default await bot(${JSON.stringify(state)})`,
				"bot.js"
			)

			if (!result.ok) throw new Error(JSON.stringify(result.error))
			return result.data
		},
		{
			executionTimeout: timeout,
			memoryLimit: 1024 * 1024,
			maxStackSize: 1024 * 1024,
			mountFs: { "bot.js": bot.latestCode },
		}
	) as Promise<[Move, Memory]>

function moveToInt(move: Move): number {
	if (move === "C") return 0
	if (move === "D") return 1
	throw new Error("Invalid move")
}

async function battle() {
	console.log("Battling...")

	const [, , , bots] = await db.query<[DBBot, DBBot][]>(selectBotsQuery)
	if (!bots) throw new Error("No bots found")

	console.log(bots)

	type MovePair = [Move, Move]

	const states: [State, State] = [
		{ history: [], memory: null },
		{ history: [], memory: null },
	]
	const history: MovePair[] = []

	try {
		for (let i = 0; i < rounds; i++) {
			const moves: MovePair = ["C", "C"]
			const memories: [Memory, Memory] = [null, null]

			for (let j = 0; j < bots.length; j++) {
				const bot = bots[j]
				if (!bot) throw new Error("Bot not found")

				const state = states[j]
				if (!state) throw new Error("State not found")

				const [move, memory] = await callBot(bot, state)
				moves[j] = move
				memories[j] = memory
			}

			states[0].memory = memories[0]
			states[1].memory = memories[1]
			states[0].history.push({ you: moves[0], opponent: moves[1] })
			states[1].history.push({ you: moves[1], opponent: moves[0] })
			history.push(moves)

			console.log("round", i, moves)
		}
	} catch (e) {
		console.error(e)
		throw e
	}

	console.log("battle complete", history)

	// commit to database
	await db.query(commitBattleQuery, {
		bots: bots.map(bot => bot.id),
		rounds: history.map(round => round.map(moveToInt)),
	})

	console.log("battle committed")

	console.log(await db.query("SELECT * FROM battle"))
}

// setInterval(, 1000)
battle()

import { readdirSync } from "node:fs"
import { type RecordId, Surreal } from "surrealdb"
import type { Memory, Move, State } from "./bots/bot"
import commitBattleQuery from "./commitBattle.surql?raw"
import createBotQuery from "./createBot.surql?raw"
import initQuery from "./init.surql?raw"
import type {
	QuickJSContext,
	QuickJSHandle,
} from "./node_modules/quickjs-emscripten/dist/index.d.mts"
import {
	getQuickJS,
	shouldInterruptAfterDeadline,
} from "./node_modules/quickjs-emscripten/dist/index.mjs"
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

type BotIsolate = {
	bot: DBBot
	context: QuickJSContext
	botFunction: QuickJSHandle
}

const rounds = 10
const timeout = 100 // ms

function createIsolate(
	QuickJS: Awaited<ReturnType<typeof getQuickJS>>,
	bot: DBBot
): BotIsolate {
	const runtime = QuickJS.newRuntime({
		memoryLimitBytes: 64 * 1024 * 1024,
		maxStackSizeBytes: 1024 * 1024,
	})
	const context = runtime.newContext()

	const moduleHandle = context
		.evalCode(bot.latestCode, "bot.js", { type: "module" })
		.unwrap()
	const botFunction = context.getProp(moduleHandle, "default")
	moduleHandle.dispose()

	return { bot, context, botFunction }
}

function callBot(isolate: BotIsolate, state: State): [Move, Memory] {
	const { context, botFunction } = isolate

	context.runtime.setInterruptHandler(
		shouldInterruptAfterDeadline(Date.now() + timeout)
	)

	const stateHandle = context
		.evalCode(`(${JSON.stringify(state)})`, "state.js", { type: "global" })
		.unwrap()

	try {
		const resultHandle = context
			.callFunction(botFunction, context.undefined, stateHandle)
			.unwrap()
		try {
			return context.dump(resultHandle) as [Move, Memory]
		} finally {
			resultHandle.dispose()
		}
	} catch (e) {
		console.error(e)
		throw e
	} finally {
		stateHandle.dispose()
		context.runtime.removeInterruptHandler()
	}
}

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

	const QuickJS = await getQuickJS()

	const isolates = bots.map(bot => createIsolate(QuickJS, bot))

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

			for (let j = 0; j < isolates.length; j++) {
				const isolate = isolates[j]
				if (!isolate) throw new Error("Isolate not found")

				const state = states[j]
				if (!state) throw new Error("State not found")

				const [move, memory] = callBot(isolate, state)
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
	} finally {
		for (const isolate of isolates) {
			isolate.botFunction.dispose()
			isolate.context.dispose()
		}
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

import { createIsolate, Reference } from "@absolutejs/isolated-jsc"
import { Surreal } from "surrealdb"
import alwaysCooperateBot from "./bots/alwaysCooperate?raw"
import alwaysDefectBot from "./bots/alwaysDefect?raw"
import type { Match, Memory, Move, State } from "./bots/bot"
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

const compile = (code: string) =>
	new Bun.Transpiler({ loader: "ts" }).transformSync(code)

console.log("connected")

await db.query(createBotQuery, {
	name: "alwaysCooperate",
	code: compile(alwaysCooperateBot),
})

await db.query(createBotQuery, {
	name: "alwaysDefect",
	code: compile(alwaysDefectBot),
})

setInterval(async () => {
	console.log("Battling...")

	type DBBot = {
		codeHash: string
		latestCode: string
		name: string
	}

	const [, , , bots] = await db.query<[DBBot, DBBot][]>(selectBotsQuery)
	if (!bots) throw new Error("No bots found")

	console.log(bots)

	const isolates = await Promise.all(
		bots.map(async bot => {
			const isolate = await createIsolate({ memoryLimit: 64 })
			const [context, script] = await Promise.all([
				isolate.createContext(),
				isolate.compileScript(bot.latestCode),
			])

			return { bot, isolate, script, context }
		})
	)

	const rounds = 10

	type MovePair = [Move, Move]

	const defaultState: State = {
		history: [],
		memory: null,
	}

	// const memory: [Memory, Memory] = [null, null]
	const states: [State, State] = [
		structuredClone(defaultState),
		structuredClone(defaultState),
	]
	const history: MovePair[] = []

	console.log(isolates)

	// for (let i = 0; i < rounds; i++) {
	for (let j = 0; j < isolates.length; j++) {
		const isolate = isolates[j]
		if (!isolate) throw new Error("Isolate not found")

		const state = states[j]
		if (!state) throw new Error("State not found")

		const result = await isolate.script.run(isolate.context)
		console.log(j, result)
	}
	// }
}, 1000)

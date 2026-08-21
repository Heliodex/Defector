import { Agent, expect, expectComplete } from "@isolated-vm/experimental"
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

await db.query(createBotQuery, {
	name: "alwaysCooperate",
	source: alwaysCooperateBot,
	transpiled: await transpile(alwaysCooperateBot),
})

await db.query(createBotQuery, {
	name: "alwaysDefect",
	source: alwaysDefectBot,
	transpiled: await transpile(alwaysDefectBot),
})

async function battle() {
	console.log("Battling...")

	type DBBot = {
		codeHash: string
		latestCode: string
		name: string
	}

	const [, , , bots] = await db.query<[DBBot, DBBot][]>(selectBotsQuery)
	if (!bots) throw new Error("No bots found")

	console.log(bots[1].latestCode)

	const isolates = await Promise.all(
		bots.map(async bot => {
			// const isolate = await createIsolate({ memoryLimit: 64 })
			// const [context, script] = await Promise.all([
			// 	isolate.createContext(),
			// 	isolate.compileScript(bot.latestCode),
			// ])
			const agent = await Agent.create()
			const realm = await agent.createRealm()

			const module = await agent.compileModule(bot.latestCode)
			if (!module?.complete) throw new Error("Module not compiled")

			const { result } = module
			console.log(await result.evaluate(realm))

			return { bot }
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
}

// setInterval(, 1000)
battle()

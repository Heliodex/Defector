import { Surreal } from "surrealdb"
import initQuery from "./init.surql?raw"

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

export async function reconnect() {
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
			await new Promise(resolve => setTimeout(resolve, 1000))
		}

	await db.query(initQuery)
}

await reconnect()

console.log("connected")

console.log(await db.query("SELECT * FROM bot"))

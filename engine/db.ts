import type { Surreal } from "surrealdb"
import { Surreal as SurrealClient } from "surrealdb"

export const db: Surreal = new SurrealClient({
	codecOptions: {
		useNativeDates: true,
	},
})

const url = new URL(process.env.SURREAL_URL ?? "ws://localhost:8003")

/**
 * Connects to the database started by the site, retrying indefinitely so the
 * engine can boot before (or restart after) the site.
 */
export async function reconnect(): Promise<void> {
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

			return
		} catch (err) {
			const e = err as Error

			console.error("Failed to connect to database:", e.message)

			if (attempt === 4)
				console.log("Multiple connection attempts failed")

			console.log("Retrying connection in 1 second...")
			await Bun.sleep(1000)
		}
}

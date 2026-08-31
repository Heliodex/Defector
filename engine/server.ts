import { type Surreal, ThrownError } from "surrealdb"
import { type DBBot, runBattle } from "./runner"
import selectBotsQuery from "./selectBots.surql?raw"

export const battleIntervalMs = Number(process.env.BATTLE_INTERVAL_MS ?? 100)

/**
 * Runs the live tournament: every `battleIntervalMs` it picks two random active bots and plays a single 1v1 battle. Runs forever; the site and this process only coordinate through the shared database.
 */
export async function start(db: Surreal): Promise<never> {
	console.log(`Starting tournament — one battle every ${battleIntervalMs}ms`)

	for (;;) {
		try {
			// selectBots.surql throws when fewer than 2 bots are active.
			const [, , , bots] =
				await db.query<[DBBot, DBBot][]>(selectBotsQuery)

			if (!bots) throw new Error("Query returned no bots")

			console.log(`${bots[0]?.name} vs ${bots[1]?.name}`)
			await runBattle(db, [bots[0], bots[1]])
		} catch (error) {
			if (error instanceof ThrownError)
				switch (error.message) {
					case "An error occurred: Not enough bots to play":
						console.log("Not enough active bots, skipping battle")
						break
					default:
						console.error("Unknown ThrownError:", error.message)
				}
			else console.error("Battle failed:", error)
		}

		await Bun.sleep(battleIntervalMs)
	}
}

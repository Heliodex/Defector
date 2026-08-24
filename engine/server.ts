import type { Surreal } from "surrealdb"
import { type DBBot, runBattle } from "./runner"
import selectBotsQuery from "./selectBots.surql?raw"

export const battleIntervalMs = Number(process.env.BATTLE_INTERVAL_MS ?? 10000)

/**
 * Runs the live tournament: every `battleIntervalMs` it picks two random active bots and plays a single 1v1 battle. Runs forever; the site and this process only coordinate through the shared database.
 */
export async function start(db: Surreal): Promise<never> {
	console.log(`Starting tournament — one battle every ${battleIntervalMs}ms`)

	let hadEnoughBots = false

	for (;;) {
		try {
			// selectBots.surql throws when fewer than 2 bots are active.
			const [, , , bots] =
				await db.query<[DBBot, DBBot][]>(selectBotsQuery)
			if (!bots || bots.length < 2) {
				if (hadEnoughBots)
					console.log("Not enough active bots — waiting.")
				hadEnoughBots = false
			} else {
				hadEnoughBots = true
				console.log(`${bots[0]?.name} vs ${bots[1]?.name}`)
				await runBattle(db, [bots[0], bots[1]])
			}
		} catch (error) {
			console.error("Battle failed:", error)
		}

		await Bun.sleep(battleIntervalMs)
	}
}

import type { Uuid } from "surrealdb"
import { Battle, db, type RecordId } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardBattlesQuery from "./leaderboardBattles.surql?raw"
import leaderboardBotsQuery from "./leaderboardBots.surql?raw"

export type BattleRow = {
	id: string
	created: Date
	botNames: [string, string]
	botIds: [string, string]
}

type BotRow = {
	id: string
	name: string
	elo: number
	stats: BotStats
	ownerName?: string
}

export type LeaderboardData = {
	battles: BattleRow[]
	allBattles: number
	bots: BotRow[]
	activeBots: number
	og?: boolean
}

async function battlesSnapshot(
	id?: RecordId<"battle", string>
): Promise<Pick<LeaderboardData, "battles" | "allBattles">> {
	const [battles, battleCount] = await db.query<[BattleRow[], number, Uuid]>(
		leaderboardBattlesQuery,
		{ id }
	)

	return {
		battles,
		allBattles: battleCount ?? 0,
	}
}

async function botsSnapshot(
	id?: RecordId<"bot", string>
): Promise<Pick<LeaderboardData, "bots" | "activeBots">> {
	const [bots, botCount] = await db.query<[BotRow[], number, Uuid]>(
		leaderboardBotsQuery,
		{ id }
	)

	return {
		bots,
		activeBots: botCount ?? 0,
	}
}

export const leaderboardData = query.live(
	async function* (): AsyncGenerator<LeaderboardData> {
		const [battleData, botData] = await Promise.all([
			battlesSnapshot(),
			botsSnapshot(),
		])
		yield { ...battleData, ...botData, og: true }

		for await (const { action, recordId } of await db.live(Battle)) {
			if (action !== "CREATE" || !recordId) continue

			const id = recordId as RecordId<"battle", string>

			const [updatedBattles, updatedBots] = await Promise.all([
				battlesSnapshot(id),
				botsSnapshot(),
			])

			yield { ...updatedBattles, ...updatedBots }
		}
	}
)

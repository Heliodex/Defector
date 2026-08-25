import type { Uuid } from "surrealdb"
import { db } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardBattlesQuery from "./leaderboardBattles.surql?raw"
import leaderboardBotsQuery from "./leaderboardBots.surql?raw"

type BattleRow = {
	id: string
	created: Date
	botNames: [string, string]
	botIds: [string, string]
}

type BotRow = {
	id: string
	name: string
	elo: number
	wins: number
	losses: number
	totalBattles: number
	ownerName: string | null
}

export type LeaderboardBattles = {
	battles: BattleRow[]
	totalBattles: number
}

export type LeaderboardBots = {
	bots: BotRow[]
	activeBots: number
}

async function battlesSnapshot(): Promise<LeaderboardBattles> {
	const [battles, battleCount] = await db.query<[BattleRow[], number]>(
		leaderboardBattlesQuery
	)

	return {
		battles,
		totalBattles: battleCount ?? 0,
	}
}

async function botsSnapshot(): Promise<LeaderboardBots> {
	const [bots, botCount] =
		await db.query<[BotRow[], number]>(leaderboardBotsQuery)

	return {
		bots,
		activeBots: botCount ?? 0,
	}
}

export const leaderboardBattles = query.live(
	async function* (): AsyncGenerator<LeaderboardBattles> {
		yield await battlesSnapshot()

		const [id] = await db.query<Uuid[]>("LIVE SELECT * FROM battle")

		for await (const { action, value } of await db.liveOf(id)) {
			if (action !== "CREATE") continue

			console.log("CREATE", value)

			yield await battlesSnapshot()
		}
	}
)

export const leaderboardBots = query.live(
	async function* (): AsyncGenerator<LeaderboardBots> {
		yield await botsSnapshot()

		const [id] = await db.query<Uuid[]>("LIVE SELECT * FROM bot")

		for await (const { action, value } of await db.liveOf(id)) {
			if (action !== "CREATE") continue

			console.log("CREATE", value)

			yield await botsSnapshot()
		}
	}
)

import type { Uuid } from "surrealdb"
import { db } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardBattlesQuery from "./leaderboardBattles.surql?raw"
import leaderboardBotsQuery from "./leaderboardBots.surql?raw"

type BattleRow = {
	id: string
	created: Date
	scores: [number, number]
	errors: [string?, string?]
	bot0: string
	bot1: string
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
	console.log("ss1")
	const [battles, battleCount] = await db.query<[BattleRow[], number]>(
		leaderboardBattlesQuery
	)

	console.log("ss2")
	return {
		battles,
		totalBattles: battleCount ?? 0,
	}
}

async function botsSnapshot(): Promise<LeaderboardBots> {
	console.log("ss1")
	const [bots, botCount] =
		await db.query<[BotRow[], number]>(leaderboardBotsQuery)

	console.log("ss2")
	return {
		bots,
		activeBots: botCount ?? 0,
	}
}

export const leaderboardBattles = query.live(
	async function* (): AsyncGenerator<BattleRow> {
		const battles = await battlesSnapshot()
		for (const battle of battles.battles) yield battle

		const [id] = await db.query<Uuid[]>("LIVE SELECT * FROM battle")

		for await (const { action, value } of await db.liveOf(id)) {
			console.log(`${action}:`, value)
			if (action !== "CREATE") continue

			console.log("CREATE", value)
			yield {}
		}
	}
)

export const leaderboardBots = query.live(
	async function* (): AsyncGenerator<BotRow> {
		const bots = await botsSnapshot()
		for (const bot of bots.bots) yield bot

		const [id] = await db.query<Uuid[]>("LIVE SELECT * FROM bot")

		for await (const { action, value } of await db.liveOf(id)) {
			console.log(`${action}:`, value)
			if (action !== "CREATE") continue

			console.log("CREATE", value)
			yield {}
		}
	}
)

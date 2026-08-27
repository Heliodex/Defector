import type { Uuid } from "surrealdb"
import { Battle, Bot, db, type RecordId } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardBattlesQuery from "./leaderboardBattles.surql?raw"
import leaderboardBotsQuery from "./leaderboardBots.surql?raw"

export type BattleRow = {
	id: string
	created: Date
	botNames: [string, string]
	botIds: [string, string]
}

export interface BattleRowLive extends BattleRow {
	allBattles: number
}

type BotRow = {
	id: string
	name: string
	elo: number
	wins: number
	losses: number
	totalBattles: number
	ownerName?: string
}

export interface BotRowLive extends BotRow {
	activeBots: number
}

export type LeaderboardBattles = {
	battles: BattleRow[]
	allBattles: number
	og?: boolean
}

export type LeaderboardBots = {
	bots: BotRow[]
	activeBots: number
	og?: boolean
}

async function battlesSnapshot(
	id?: RecordId<"battle", string>
): Promise<LeaderboardBattles> {
	const [battles, battleCount] = await db.query<[BattleRow[], number, Uuid]>(
		leaderboardBattlesQuery,
		{ id }
	)

	return {
		battles,
		allBattles: battleCount ?? 0,
		...(!id && { og: true }),
	}
}

async function botsSnapshot(
	id?: RecordId<"bot", string>
): Promise<LeaderboardBots> {
	const [bots, botCount] = await db.query<[BotRow[], number, Uuid]>(
		leaderboardBotsQuery,
		{ id }
	)

	return {
		bots,
		activeBots: botCount ?? 0,
		...(!id && { og: true }),
	}
}

export const leaderboardBattles = query.live(
	async function* (): AsyncGenerator<LeaderboardBattles> {
		const snapshot = await battlesSnapshot()
		yield snapshot

		for await (const { action, recordId } of await db.live(Battle)) {
			if (action !== "CREATE") {
				console.log(action, recordId)
				continue
			}

			const id = recordId as unknown as RecordId<"battle", string>
			console.log("CREATE", id)

			yield await battlesSnapshot(id)
		}
	}
)

export const leaderboardBots = query.live(
	async function* (): AsyncGenerator<LeaderboardBots> {
		console.log("getting bots")
		const snapshot = await botsSnapshot()
		console.log("got bots")
		yield snapshot

		for await (const { action, value } of await db.live(Bot)) {
			if (action !== "UPDATE") {
				console.log(action, value)
				continue
			}

			const id = value.id as unknown as RecordId<"bot", string>
			console.log("UPDATE", id)

			yield await botsSnapshot(id)
		}
	}
)

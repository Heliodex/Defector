import type { Uuid } from "surrealdb"
import { db } from "#lib/server/db.js"
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

async function battlesSnapshot(): Promise<[LeaderboardBattles, Uuid]> {
	const [battles, battleCount, lqid] = await db.query<
		[BattleRow[], number, Uuid]
	>(leaderboardBattlesQuery)

	return [
		{
			battles,
			allBattles: battleCount ?? 0,
			og: true,
		},
		lqid,
	]
}

async function botsSnapshot(): Promise<[LeaderboardBots, Uuid]> {
	const [bots, botCount, lqid] =
		await db.query<[BotRow[], number, Uuid]>(leaderboardBotsQuery)

	return [
		{
			bots,
			activeBots: botCount ?? 0,
			og: true,
		},
		lqid, // liquid lol
	]
}

export const leaderboardBattles = query.live(
	async function* (): AsyncGenerator<LeaderboardBattles> {
		const [snapshot, lqid] = await battlesSnapshot()
		yield snapshot

		const lq = await db.liveOf(lqid)
		console.log("battles lq", lq)

		for await (const { action, value } of lq) {
			if (action !== "CREATE") {
				console.log(action, value)
				continue
			}

			const v = value as unknown as BattleRowLive
			console.log("CREATE", v)

			yield {
				battles: [v],
				allBattles: v.allBattles,
			}
		}
	}
)

export const leaderboardBots = query.live(
	async function* (): AsyncGenerator<LeaderboardBots> {
		const [snapshot, lqid] = await botsSnapshot()
		yield snapshot

		const lq = await db.liveOf(lqid)
		console.log("bots lq", lq)

		for await (const { action, value } of lq) {
			if (action !== "UPDATE") {
				console.log(action, value)
				continue
			}

			const v = value as unknown as BotRowLive
			console.log("UPDATE", v)

			yield {
				bots: [v],
				activeBots: v.activeBots,
			}
		}
	}
)

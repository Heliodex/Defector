import type { LiveMessage } from "surrealdb"
import { Battle, Bot, db } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardQuery from "./leaderboard.surql?raw"

type BotRow = {
	id: string
	name: string
	elo: number
	wins: number
	losses: number
	totalBattles: number
	ownerName: string | null
}

type BattleRow = {
	id: string
	created: Date
	scores: [number, number]
	errors: [string?, string?]
	bot0: string
	bot1: string
	botIds: [string, string]
}

export type Leaderboard = {
	connected: boolean
	bots: BotRow[]
	battles: (Omit<BattleRow, "created"> & { created: string })[]
	totalBattles: number
	activeBots: number
}

const disconnected: Leaderboard = {
	connected: false,
	bots: [],
	battles: [],
	totalBattles: 0,
	activeBots: 0,
}

async function readSnapshot(): Promise<Leaderboard> {
	console.log("ss1")
	const [bots, battles, botCount, battleCount] =
		await db.query<[BotRow[], BattleRow[], number, number]>(
			leaderboardQuery
		)

	console.log("ss2")
	return {
		connected: true,
		bots: (bots ?? []).map(bot => ({
			...bot,
			// Format dates server-side so SSR and live values match
			// (this snapshot's date fields only appear on `battles`).
		})),
		battles: (battles ?? []).map(battle => ({
			...battle,
			created: new Date(battle.created).toLocaleString(),
		})),
		totalBattles: battleCount ?? 0,
		activeBots: botCount ?? 0,
	}
}

/**
 * Live leaderboard. The client subscribes to this async generator; SurrealDB live queries on the `bot` and `battle` tables act as invalidation signals — whenever either table changes we re-read the database and yield a fresh snapshot, which is streamed to subscribers. If a refresh fails we yield a "disconnected" snapshot.
 */
export const leaderboard = query.live(
	async function* (): AsyncGenerator<Leaderboard> {
		console.log("leaderboard live query started")

		// Wake up the snapshot loop whenever a live query notification arrives
		let wake: (() => void) | null = null
		const changed = () => {
			wake?.()
			wake = null
		}
		const nextChange = () =>
			new Promise<void>(resolve => {
				wake = resolve
			})

		let snapshot: Leaderboard
		try {
			console.log("reading snapshot")
			snapshot = await readSnapshot()
			console.log("read snapshot")
		} catch (error) {
			console.error("Leaderboard initial load failed:", error)
			throw error
		}
		console.log("loaded snapshot", snapshot)

		const subs = await Promise.all([db.live(Bot), db.live(Battle)])

		try {
			for (const sub of subs)
				sub.subscribe((message: LiveMessage) => {
					if (message.action !== "KILLED") changed()
				})

			for (;;) {
				console.log("Yielding")
				yield snapshot
				await nextChange()

				try {
					snapshot = await readSnapshot()
				} catch (error) {
					console.error("Leaderboard update failed:", error)
					snapshot = disconnected
				}
			}
		} finally {
			await Promise.all(subs.map(sub => sub.kill().catch(() => {})))
		}
	}
)

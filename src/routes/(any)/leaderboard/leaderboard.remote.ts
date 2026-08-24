import type { LiveMessage } from "surrealdb"
import { Battle, Bot, db } from "#lib/server/db.js"
import { query } from "$app/server"
import leaderboardQuery from "./leaderboard.surql?raw"
import recentBattlesQuery from "./recentBattles.surql?raw"

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

const countsQuery =
	"SELECT count() AS battles FROM battle; SELECT count() AS bots FROM bot;"

const disconnected: Leaderboard = {
	connected: false,
	bots: [],
	battles: [],
	totalBattles: 0,
	activeBots: 0,
}

async function readSnapshot(): Promise<Leaderboard> {
	const [bots] = await db.query<BotRow[][]>(leaderboardQuery)
	const [battles] = await db.query<BattleRow[][]>(recentBattlesQuery)
	const [[counts]] =
		await db.query<
			{
				battles: number
				bots: number
			}[][]
		>(countsQuery)

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
		totalBattles: counts?.battles ?? 0,
		activeBots: counts?.bots ?? 0,
	}
}

/**
 * Live leaderboard. The client subscribes to this async generator; SurrealDB live queries on the `bot` and `battle` tables act as invalidation signals — whenever either table changes we re-read the database and yield a fresh snapshot, which is streamed to subscribers. If a refresh fails we yield a "disconnected" snapshot.
 */
export const leaderboard = query.live(
	async function* (): AsyncGenerator<Leaderboard> {
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
			snapshot = await readSnapshot()
		} catch (error) {
			console.error("Leaderboard initial load failed:", error)
			snapshot = disconnected
		}

		const subs = await Promise.all([db.live(Bot), db.live(Battle)])

		try {
			for (const sub of subs)
				sub.subscribe((message: LiveMessage) => {
					if (message.action !== "KILLED") changed()
				})

			for (;;) {
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
			for (const subscription of subs)
				await subscription.kill().catch(() => {})
		}
	}
)

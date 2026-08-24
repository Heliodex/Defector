import { db } from "#lib/server/db.js"
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

const pollMs = Number(process.env.BATTLE_INTERVAL_MS ?? 10000)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Live leaderboard. The client subscribes to this async generator; every
 * `pollMs` we re-read the database and yield a fresh snapshot, which is
 * streamed to subscribers. If a poll fails we yield a "disconnected" snapshot.
 */
export const leaderboard = query.live(
	async function* (): AsyncGenerator<Leaderboard> {
		for (;;) {
			try {
				const [bots] = await db.query<BotRow[][]>(leaderboardQuery)
				const [battles] =
					await db.query<BattleRow[][]>(recentBattlesQuery)
				const [[counts]] =
					await db.query<
						{
							battles: number
							bots: number
						}[][]
					>(countsQuery)

				yield {
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
			} catch (error) {
				console.error("Leaderboard poll failed:", error)
				yield {
					connected: false,
					bots: [],
					battles: [],
					totalBattles: 0,
					activeBots: 0,
				}
			}

			await sleep(pollMs)
		}
	}
)

import type { LiveMessage, ManagedLiveSubscription } from "surrealdb"
import { Battle, db, Record } from "#lib/server/db.js"
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
	meanScore: number
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

// Yielded when the battle stream goes quiet, just so the generator stays interruptible (an async generator can only be cancelled at a yield) - the page skips it.
export type LeaderboardHeartbeat = { heartbeat: true }

// The engine creates battles several times a second, far faster than a full snapshot per notification could ever be served, so live updates are coalesced into bursts: battle CREATEs are queued, and each pass drains the queue (up to the page's list length) and answers the whole burst with a single refresh. Rows come straight from the notifications themselves (their value carries created + the materialised botIds), so the hot path never touches the battle table at all - the top-50 scan and the O(battles) count() only run once, in the initial snapshot, and allBattles is tracked incrementally after that.
const maxBatch = 50
const heartbeat = 10_000

async function battlesSnapshot(): Promise<
	Pick<LeaderboardData, "battles" | "allBattles">
> {
	const [battles, allBattles] = await db.query<[BattleRow[], number]>(
		leaderboardBattlesQuery
	)

	return { battles, allBattles }
}

async function botsSnapshot(): Promise<
	Pick<LeaderboardData, "bots" | "activeBots">
> {
	const [bots, activeBots] =
		await db.query<[BotRow[], number]>(leaderboardBotsQuery)

	return { bots, activeBots }
}

// The battle fields carried on every live notification.
type LiveBattle = {
	created: Date
	botIds: [string, string]
}

export const leaderboardData = query.live(async function* (): AsyncGenerator<
	LeaderboardData | LeaderboardHeartbeat
> {
	// Register the live query BEFORE taking the initial snapshot, and attach the notification handler IMMEDIATELY (before ready()/the snapshot queries): from this moment every notification is buffered in our own queue, so battles created while the snapshot runs are never missed (the SDK's dispatcher buffers anything before server registration completes). Battles inside the snapshot/queue overlap are deduped against the snapshot's ids below.
	const sub = (await db.live(Battle)) as ManagedLiveSubscription

	// NOTE: deliberately NOT iterating the subscription. The SDK's notification channel only delivers a message to an in-flight next() and never clears its waiter slot, so anything arriving while an async consumer is busy between next() calls (i.e. all of ours) resolves a settled promise and is silently dropped - verified losing 15-20% of notifications under a battle burst.
	// The push subscription stays lossless because its internal loop re-arms next() synchronously when the handler returns, so the handler must stay synchronous: queue and wake, await nothing.
	const queue: LiveMessage[] = []
	let wake: (() => void) | undefined
	sub.subscribe(msg => {
		queue.push(msg)
		wake?.()
		wake = undefined
	})

	try {
		// `ready()` exists on the ManagedLiveSubscription this resolves to; the abstract LiveSubscription type just hides it.
		await sub.ready()
		console.time("init")
		const [battleData, botData] = await Promise.all([
			battlesSnapshot(),
			botsSnapshot(),
		])
		console.timeEnd("init")

		let allBattles = battleData.allBattles
		const snapshotted = new Set(battleData.battles.map(battle => battle.id))
		yield { ...battleData, ...botData, og: true }

		// Bot names for the battle feed, replacing the per-row battleBotNames() lookups: seeded from each ladder refresh and backfilled with single-record reads for bots outside the top 20 (names only go stale if a bot is renamed without battling since).
		const botNames = new Map<string, string>(
			botData.bots.map(b => [b.id, b.name])
		)

		outer: for (;;) {
			// Wait for activity. The timeout only matters while quiet: it bounds how long teardown (.return() from the harness after the client left) takes to reach the next yield.
			if (queue.length === 0)
				await Promise.race([
					new Promise<void>(resolve => (wake = resolve)),
					Bun.sleep(heartbeat),
				])

			const batch: { id: string; battle: LiveBattle }[] = []
			while (queue.length && batch.length < maxBatch) {
				const msg = queue.shift()
				if (!msg) continue // I guess

				if (msg.action === "KILLED") break outer
				if (msg.action === "CREATE" && msg.recordId) {
					const id = msg.recordId.id.toString()
					// skip battles the initial snapshot already showed
					if (!snapshotted.has(id))
						batch.push({
							id,
							battle: msg.value as unknown as LiveBattle,
						})
				}
			}

			if (!batch.length) {
				// only timeouts / non-CREATEs since the last refresh
				yield { heartbeat: true }
				continue
			}

			const unseen = [
				...new Set(batch.flatMap(lb => lb.battle.botIds)),
			].filter(id => !botNames.has(id))

			const [updatedBots] = await Promise.all([
				botsSnapshot(),
				...unseen.map(async id => {
					const [name] = await db.query<[string | undefined]>(
						"SELECT VALUE name FROM ONLY $bot",
						{ bot: Record("bot", id) }
					)
					if (name) botNames.set(id, name)
				}),
			])
			for (const bot of updatedBots.bots) botNames.set(bot.id, bot.name)

			allBattles += batch.length
			yield {
				// newest first, so the page can prepend the batch as-is
				battles: batch.reverse().map(({ id, battle }) => ({
					id,
					created: battle.created,
					botNames: battle.botIds.map(
						botId => botNames.get(botId) ?? ""
					) as [string, string],
					botIds: battle.botIds,
				})),
				allBattles,
				...updatedBots,
			}
		}
	} finally {
		// Release the per-viewer live query when the stream tears down (client navigated away, or SSR closed the iterator after the first yield).
		await sub.kill().catch(() => {})
	}
})

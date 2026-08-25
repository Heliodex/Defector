import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { db, Record } from "#lib/server/db.js"
import { query } from "$app/server"
import getBotQuery from "./getBot.surql?raw"
import getBotHistoryQuery from "./getBotHistory.surql?raw"

type BotRow = {
	id: string
	name: string
	description: string | null
	codeUrl: string | null
	active: boolean
	created: Date
	elo: number
	wins: number
	losses: number
	totalBattles: number
	ownerName: string | null
	source: string | null
	updated: Date | null
}

type HistoryRow = {
	id: string
	created: Date
	delta: number
	score: number
}

export type Bot = BotRow & { eloHistory: { index: number; elo: number }[] }

export const getBot = query(type.string, async (id: string): Promise<Bot> => {
	const bot = Record("bot", id)

	const [row] = await db.query<[BotRow]>(getBotQuery, { bot })
	if (!row) error(404, "Bot not found")

	const [historyRows] = await db.query<[HistoryRow[]]>(getBotHistoryQuery, {
		bot,
	})

	// The query is newest-first, so walk it backwards to build ascending Elo.
	// Start from the base rating and apply each battle's delta in historical order.
	let elo = 1000
	const eloHistory: { index: number; elo: number }[] = []
	for (let i = historyRows.length - 1; i >= 0; i--) {
		elo += historyRows[i].delta
		eloHistory.push({
			index: eloHistory.length,
			elo: Math.round(elo),
		})
	}

	return {
		...row,
		source: row.source ?? "",
		eloHistory,
	}
})

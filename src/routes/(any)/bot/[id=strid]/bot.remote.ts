import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { db, Record } from "#lib/server/db.js"
import { query } from "$app/server"
import getBotQuery from "./getBot.surql?raw"
import getBotBattlesQuery from "./getBotBattles.surql?raw"

type BotRow = {
	id: string
	name: string
	description: string | null
	codeUrl: string | null
	active: boolean
	created: Date
	meanScore: number
	scoreHistory: number[]
	stats: BotStats
	ownerName: string | null
	source: string | null
	updated: Date | null
}

export type Bot = BotRow & { scoreHistory: number[] }

export const getBot = query(type.string, async (id: string): Promise<Bot> => {
	const bot = Record("bot", id)

	const [row] = await db.query<[BotRow]>(getBotQuery, { bot })
	if (!row) error(404, "Bot not found")

	return {
		...row,
		source: row.source ?? "",
	}
})

export type BotBattle = {
	id: string
	created: Date
	botNames: [string, string]
	botIds: [string, string]
}

export const getBotBattles = query(
	type.string,
	async (id: string): Promise<BotBattle[]> => {
		const bot = Record("bot", id)

		const [battles] = await db.query<[BotBattle[]]>(
			getBotBattlesQuery,
			{ bot }
		)
		return battles ?? []
	}
)

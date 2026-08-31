import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { db, Record } from "#lib/server/db.js"
import { query } from "$app/server"
import getBotQuery from "./getBot.surql?raw"

type BotRow = {
	id: string
	name: string
	description: string | null
	codeUrl: string | null
	active: boolean
	created: Date
	elo: number
	eloHistory: number[]
	stats: BotStats
	ownerName: string | null
	source: string | null
	updated: Date | null
}

export type Bot = BotRow & { eloHistory: number[] }

export const getBot = query(type.string, async (id: string): Promise<Bot> => {
	const bot = Record("bot", id)

	const [row] = await db.query<[BotRow]>(getBotQuery, { bot })
	if (!row) error(404, "Bot not found")

	return {
		...row,
		source: row.source ?? "",
	}
})

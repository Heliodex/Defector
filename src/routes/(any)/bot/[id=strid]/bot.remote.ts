import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import type { BotStatus } from "#lib/botStatus.js"
import { db, Record } from "#lib/server/db.js"
import setBotActive from "#lib/server/setBotActive.js"
import { form, getRequestEvent, query } from "$app/server"
import getBotQuery from "./getBot.surql?raw"
import getBotBattlesQuery from "./getBotBattles.surql?raw"

type BotRow = {
	id: string
	name: string
	description: string | null
	codeUrl: string | null
	active: BotStatus
	created: Date
	meanScore: number
	curScores: number[]
	stats: BotStats
	ownerName: string | null
	source: string | null
	updated: Date | null
}

export const getBot = query(
	type.string,
	async (id: string): Promise<BotRow> => {
		const bot = Record("bot", id)

		const [row] = await db.query<[BotRow]>(getBotQuery, { bot })
		if (!row) error(404, "Bot not found")

		return {
			...row,
			source: row.source ?? "",
		}
	}
)

export type BotBattle = {
	id: string
	created: Date
	botNames: [string, string]
	botIds: [string, string]
	scores: [number, number]
}

export const getBotBattles = query(
	type.string,
	async (id: string): Promise<BotBattle[]> => {
		const bot = Record("bot", id)

		const [battles] = await db.query<[BotBattle[]]>(getBotBattlesQuery, {
			bot,
		})
		return battles ?? []
	}
)

export const isBotOwner = query(type.string, async (id: string) => {
	const { locals } = getRequestEvent()
	const user = locals.user
	if (!user) return false

	const [rows] = await db.query<unknown[][]>(
		"SELECT VALUE id FROM $user->created->bot WHERE record::id(id) = $id",
		{ user: user.id, id }
	)
	return (rows?.length ?? 0) > 0
})

const statusSchema = type({
	id: "string",
	status: "'active'|'inactive'|'archived'",
})

export const setStatusForm = form(statusSchema, async ({ id, status }) => {
	const res = await setBotActive(id, status)
	await getBot(id).refresh()
	return res
})

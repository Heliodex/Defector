import { type } from "#lib/arktype.js"
import type { BotStatus } from "#lib/botStatus.js"
import { authorise } from "#lib/server/auth.js"
import listArchivedBotsQuery from "#lib/server/bot/listArchivedBots.surql?raw"
import listBotsQuery from "#lib/server/bot/listBots.surql?raw"
import { db } from "#lib/server/db.js"
import setBotActive from "#lib/server/setBotActive.js"
import { form, query } from "$app/server"

type MyBot = {
	id: string
	name: string
	description: string
	active: BotStatus
	created: Date
	meanScore: number
	stats: BotStats
}

export const getMyBots = query(async (): Promise<MyBot[]> => {
	const { user } = await authorise()
	const [results] = await db.query<MyBot[][]>(listBotsQuery, {
		user: user.id,
	})
	return results
})

export const getArchivedBots = query(async (): Promise<MyBot[]> => {
	const { user } = await authorise()
	const [results] = await db.query<MyBot[][]>(listArchivedBotsQuery, {
		user: user.id,
	})
	return results
})

const statusSchema = type({
	id: "string",
	status: "'active'|'inactive'|'archived'",
})

export const setStatusForm = form(statusSchema, async ({ id, status }) => {
	return setBotActive(id, status)
})

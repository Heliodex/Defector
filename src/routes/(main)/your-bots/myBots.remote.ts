import { type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import listBotsQuery from "#lib/server/bot/listBots.surql?raw"
import { db } from "#lib/server/db.js"
import setBotActive from "#lib/server/setBotActive.js"
import { form, query } from "$app/server"

type MyBot = {
	id: string
	name: string
	description: string
	active: boolean
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

const toggleSchema = type({
	id: "string",
	"active?": "boolean",
})

export const toggleActiveForm = form(toggleSchema, async ({ id, active }) => {
	return setBotActive(id, active)
})

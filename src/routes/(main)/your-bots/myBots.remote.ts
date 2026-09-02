import { invalid } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import listBotsQuery from "#lib/server/bot/listBots.surql?raw"
import setBotActiveQuery from "#lib/server/bot/setBotActive.surql?raw"
import { db } from "#lib/server/db.js"
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
	console.time("bots")
	const [, , , results] = await db.query<
		[undefined, undefined, undefined, MyBot[]]
	>(listBotsQuery, { user: user.id })
	console.timeEnd("bots")
	return results
})

const toggleSchema = type({
	id: "string",
	"active?": "boolean",
})

export const toggleActiveForm = form(toggleSchema, async ({ id, active }) => {
	const { user } = await authorise()

	try {
		const [, updated] = await db.query<
			{ id: string; name: string; active: boolean }[]
		>(setBotActiveQuery, {
			user: user.id,
			id,
			active: active === true,
		})

		return updated
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Could not update the bot"
		invalid(message)
	}
})

import { invalid } from "@sveltejs/kit"
import type { BotStatus } from "#lib/botStatus.js"
import { authorise } from "#lib/server/auth.js"
import setBotActiveQuery from "#lib/server/bot/setBotActive.surql?raw"
import { db } from "#lib/server/db.js"

export default async (id: string, status: BotStatus) => {
	const { user } = await authorise()

	try {
		const [, updated] = await db.query<
			{ id: string; name: string; active: BotStatus }[]
		>(setBotActiveQuery, { user, id, status })

		return updated
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Could not update the bot"
		invalid(message)
	}
}

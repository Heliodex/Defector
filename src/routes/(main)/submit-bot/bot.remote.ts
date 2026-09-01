import { error, invalid } from "@sveltejs/kit"
import { makeMessage, type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import createBotQuery from "#lib/server/bot/createBot.surql?raw"
import { transpileBot } from "#lib/server/bot/transpile.js"
import { db } from "#lib/server/db.js"
import getLapseDataQuery from "#lib/server/getLapseData.surql?raw"
import { form, query } from "$app/server"

const messageName = makeMessage("name", "please give your bot a name")
const messageDescription = makeMessage(
	"description",
	"please add a description of your bot"
)
const messageCode = makeMessage("code", "please paste your bot's code")

export const checkLapseAccount = query(async () => {
	const { user } = await authorise()

	const [lapse] = await db.query<{ id: string; accessToken: string }[]>(
		getLapseDataQuery,
		{ user: user.id }
	)
	console.log(lapse)
	if (!lapse?.id || !lapse?.accessToken)
		error(
			401,
			"Please link your Lapse account to submit a bot! You can do this on the home page."
		)
})

const newBotSchema = type({
	name: type("string >= 1").configure(messageName[0]),
	description: type("string >= 1").configure(messageDescription[0]),
	code: type("string >= 1").configure(messageCode[0]),
	codeUrl: "string | undefined",
	"active?": "boolean",
})
	.configure(...messageName)
	.configure(...messageDescription)
	.configure(...messageCode)

export const newBotForm = form(
	newBotSchema,
	async ({ name, description, code, codeUrl, active }) => {
		const { user } = await authorise()

		// TODO: ensure user doesn't have more than 3 bots *before* transpilation maybe?

		let transpiled: string
		try {
			transpiled = transpileBot(code)
		} catch (e) {
			const message =
				e instanceof Error
					? e.message
					: "Could not transpile your bot code"
			invalid(message)
		}

		try {
			const [id] = await db.query<string[]>(createBotQuery, {
				user: user.id,
				name,
				description,
				codeUrl,
				source: code,
				transpiled,
				active: active === true,
			})

			return { id, name }
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Could not create your bot"
			invalid(message)
		}
	}
)





import { redirect } from "@sveltejs/kit"
import { makeMessage, type } from "#lib/arktype.js"
import { isAdmin } from "#lib/server/admin.js"
import { authorise } from "#lib/server/auth.js"
import { db, Record } from "#lib/server/db.js"
import { form, getRequestEvent, query } from "$app/server"
import battlesQuery from "./battles.surql?raw"
import botsQuery from "./bots.surql?raw"
import hourSubmissionsQuery from "./hourSubmissions.surql?raw"
import reviewHourSubmissionQuery from "./reviewHourSubmission.surql?raw"

type AdminBot = {
	id: string
	name: string
	active: boolean
	created: Date
	meanScore: number
	stats: BotStats
	ownerEmail: string | null
}

export const getBots = query(async () => {
	const { user } = getRequestEvent().locals
	if (!isAdmin(user)) redirect(302, "/")

	const [rows] = await db.query<AdminBot[][]>(botsQuery)
	return (rows ?? []).map(bot => ({
		...bot,
		created: new Date(bot.created).toLocaleString(),
	}))
})

type AdminBattle = {
	id: string
	created: Date
	scores: [number, number]
	errors: [string?, string?]
	bot0: string
	bot1: string
}

export const getBattles = query(async () => {
	const { user } = getRequestEvent().locals
	if (!isAdmin(user)) redirect(302, "/")

	const [rows] = await db.query<AdminBattle[][]>(battlesQuery)
	return (rows ?? []).map(battle => ({
		...battle,
		created: new Date(battle.created).toLocaleString(),
	}))
})

type AdminSubmission = {
	id: string
	created: Date
	name: string
	description: string
	codeUrl: string
	ai: boolean
	image?: { hash: string; updated: Date }
	status: string
	lapseTimelapses: string[]
	review?: { reviewer: string; notes: string } | null
	ownerEmail: string | null
}

export const getSubmissions = query(async () => {
	const { user } = await authorise()
	if (!isAdmin(user)) redirect(302, "/")

	const [rows] = await db.query<AdminSubmission[][]>(hourSubmissionsQuery)

	return (rows ?? []).map(sub => ({
		...sub,
		// Format dates server-side so SSR and hydrated markup match
		created: new Date(sub.created).toLocaleString(),
		image: sub.image
			? {
					hash: sub.image.hash,
					updated: new Date(sub.image.updated).toLocaleString(),
				}
			: undefined,
	}))
})

const messageStatus = makeMessage("status", "please choose approve or reject")

const reviewSchema = type({
	id: "string",
	status: type("'approved' | 'rejected'").configure(messageStatus[0]),
	"notes?": "string",
}).configure(...messageStatus)

export const reviewForm = form(reviewSchema, async ({ id, status, notes }) => {
	const { user } = await authorise()
	if (!isAdmin(user)) redirect(302, "/")

	await db.query(reviewHourSubmissionQuery, {
		id: Record("hourSubmission", id),
		status,
		notes,
		admin: user.id,
	})

	return { id, status }
})

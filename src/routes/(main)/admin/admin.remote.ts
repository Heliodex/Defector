import { redirect } from "@sveltejs/kit"
import { makeMessage, type } from "#lib/arktype.js"
import { isAdmin } from "#lib/server/admin.js"
import { db, Record } from "#lib/server/db.js"
import { form, getRequestEvent, query } from "$app/server"
import battlesQuery from "./battles.surql?raw"
import botsQuery from "./bots.surql?raw"
import hourSubmissionsQuery from "./hourSubmissions.surql?raw"
import projectsQuery from "./projects.surql?raw"
import reviewHourSubmissionQuery from "./reviewHourSubmission.surql?raw"

type AdminProject = {
	id: string
	created: Date
	name: string
	description: string
	codeUrl: string
	playableUrl: string
	ai: boolean
	reviewerNotes?: string
	lapseTimelapses: string[]
	image?: { hash: string; updated: Date }
	submitterEmail?: string
}

export const getProjects = query(async () => {
	const { user } = getRequestEvent().locals
	if (!isAdmin(user)) redirect(302, "/")

	const [projects] = await db.query<AdminProject[][]>(projectsQuery)

	return projects.map(project => ({
		...project,
		// Format server-side so SSR and hydrated markup match
		submittedAt: new Date(project.created).toLocaleString(),
	}))
})

type AdminBot = {
	id: string
	name: string
	active: boolean
	created: Date
	elo: number
	wins: number
	losses: number
	totalBattles: number
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

type AdminHourSubmission = {
	id: string
	created: Date
	hours: number
	status: string
	lapseIds: string[]
	ownerEmail: string | null
}

export const getHourSubmissions = query(async () => {
	const { user } = getRequestEvent().locals
	if (!isAdmin(user)) redirect(302, "/")

	const [rows] = await db.query<AdminHourSubmission[][]>(hourSubmissionsQuery)
	return (rows ?? []).map(sub => ({
		...sub,
		created: new Date(sub.created).toLocaleString(),
	}))
})

const messageStatus = makeMessage("status", "please choose approve or reject")

const reviewSchema = type({
	id: "string",
	status: type("string").configure(messageStatus[0]),
}).configure(...messageStatus)

export const reviewForm = form(
	reviewSchema,
	async ({ id, status }: { id: string; status: string }) => {
		const requestEvent = getRequestEvent()
		if (!isAdmin(requestEvent.locals.user)) redirect(302, "/")

		const [result] = await db.query<
			{ id: string; status: string; hours: number }[][]
		>(reviewHourSubmissionQuery, {
			id: Record("hourSubmission", id),
			status,
			admin: requestEvent.locals.user!.id,
		})

		return result?.[0]
	}
)

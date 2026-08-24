import { redirect } from "@sveltejs/kit"
import { isAdmin } from "#lib/server/admin.js"
import { db } from "#lib/server/db.js"
import { getRequestEvent, query } from "$app/server"
import projectsQuery from "./projects.surql?raw"

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

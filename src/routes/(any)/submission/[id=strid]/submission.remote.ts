import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { db, Record } from "#lib/server/db.js"
import { query } from "$app/server"
import getPublicSubmissionQuery from "./getPublicSubmission.surql?raw"

export type PublicSubmissionBot = {
	id: string
	name: string
}

export type PublicSubmission = {
	id: string
	created: string
	name: string
	description: string
	codeUrl: string
	ai: boolean
	image?: { hash: string } | null
	bots: PublicSubmissionBot[]
}

type PublicSubmissionRow = Omit<PublicSubmission, "created"> & {
	created: Date
}

// Publicly readable: no authorisation, so the page works for logged-out visitors too. Only the fields listed in PublicSubmission are returned.
export const getPublicSubmission = query(
	type.string,
	async (id: string): Promise<PublicSubmission> => {
		const sub = Record("hourSubmission", id)

		const [row] = await db.query<[PublicSubmissionRow | null]>(
			getPublicSubmissionQuery,
			{ sub }
		)
		if (!row?.id) error(404, "Submission not found")

		return {
			...row,
			// Format dates server-side so SSR and hydrated markup match
			created: new Date(row.created).toLocaleString(),
		}
	}
)

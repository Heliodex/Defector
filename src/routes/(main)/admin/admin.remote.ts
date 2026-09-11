import { redirect } from "@sveltejs/kit"
import { makeMessage, type } from "#lib/arktype.js"
import type { BotStatus } from "#lib/botStatus.js"
import { isAdmin } from "#lib/server/admin.js"
import { authorise } from "#lib/server/auth.js"
import { db, Record } from "#lib/server/db.js"
import { form, getRequestEvent, query } from "$app/server"
import botsQuery from "./bots.surql?raw"
import hourSubmissionsQuery from "./hourSubmissions.surql?raw"
import npsQuery from "./nps.surql?raw"
import reviewHourSubmissionQuery from "./reviewHourSubmission.surql?raw"

type AdminBot = {
	id: string
	name: string
	active: BotStatus
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

// Net Promoter Score from the "how likely to recommend" survey answers, as a fraction in [-1, 1].
// Returns null when there are no responses yet (the division yields NONE).
export const getNps = query(async (): Promise<number | null> => {
	const { user } = await authorise()
	if (!isAdmin(user)) redirect(302, "/")

	const [score] = await db.query<(number | null)[]>(npsQuery)
	return Number.isFinite(score) ? score : null
})

type AdminOwnerAddress = {
	streetAddress?: string | null
	locality?: string | null
	region?: string | null
	postalCode?: string | null
	country?: string | null
} | null

type AdminOwnerInfo = {
	givenName?: string | null
	familyName?: string | null
	birthdate?: string | null
	address?: AdminOwnerAddress
} | null

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
	bots?: { id: string; name: string }[] | null
	leaderboard?: {
		rankedCount: number
		bestRank: number | null
		multiplier: number
		bots: {
			bot: string
			name: string
			meanScore: number
			rank: number | null
			multiplier: number
		}[]
	} | null
	howHear?: string | null
	howDoingWell?: string | null
	howImprove?: string | null
	howLikelyRecommend?: number | null
	review?: {
		reviewer: string
		notes: string
		privateNotes: string
		hoursSpent: string
		technicalFeatures: string
		deflation: string
	} | null
	ownerEmail: string | null
	ownerInfo?: AdminOwnerInfo
}

export const getSubmissions = query(async () => {
	const { user } = await authorise()
	if (!isAdmin(user)) redirect(302, "/")

	const [rows] = await db.query<AdminSubmission[][]>(hourSubmissionsQuery)

	return (rows ?? []).map(sub => {
		const snapById = new Map(
			(sub.leaderboard?.bots ?? []).map(e => [e.bot, e])
		)
		return {
			...sub,
			// Format dates server-side so SSR and hydrated markup match
			created: new Date(sub.created).toLocaleString(),
			image: sub.image
				? {
						hash: sub.image.hash,
						updated: new Date(sub.image.updated).toLocaleString(),
					}
				: undefined,
			bots: (sub.bots ?? []).map(bot => ({
				...bot,
				rank: snapById.get(bot.id)?.rank ?? null,
				multiplier: snapById.get(bot.id)?.multiplier ?? 1,
			})),
		}
	})
})

const messageStatus = makeMessage("status", "please choose a valid status")

const reviewSchema = type({
	id: "string",
	status: type(
		"'pending' | 'approved' | 'rejected' | 'needschanges'"
	).configure(messageStatus[0]),
	"notes?": "string",
	"privateNotes?": "string",
	"hoursSpent?": "string",
	"technicalFeatures?": "string",
	"deflation?": "string",
}).configure(...messageStatus)

export const reviewForm = form(
	reviewSchema,
	async ({
		id,
		status,
		notes,
		privateNotes,
		hoursSpent,
		technicalFeatures,
		deflation,
	}) => {
		const { user } = await authorise()
		if (!isAdmin(user)) redirect(302, "/")

		await db.query(reviewHourSubmissionQuery, {
			id: Record("hourSubmission", id),
			status,
			notes,
			privateNotes,
			hoursSpent,
			technicalFeatures,
			deflation,
			admin: user.id,
		})

		return { id, status }
	}
)

export type SubmissionHoursResult = {
	totalSeconds: number
	found: number
	missing: string[]
	timelapses: { id: string; name: string; duration: number }[]
	error: string | null
}

const emptyHours = (error: string | null): SubmissionHoursResult => ({
	totalSeconds: 0,
	found: 0,
	missing: [],
	timelapses: [],
	error,
})

/**
 * Sums the Lapse timelapse durations attached to one hour submission.
 * Looks up the *submitter's* Lapse credentials (admins review other users' submissions, so the viewer's own token is useless here) and queries the Lapse API with them. Failures are returned as `error` so one slow or broken lookup doesn't break the rest of the admin page — call this per-submission inside a `<svelte:boundary>` so cards load independently.
 */
export const getSubmissionHours = query(
	type.string,
	async (id: string): Promise<SubmissionHoursResult> => {
		const { user } = await authorise()
		if (!isAdmin(user)) redirect(302, "/")

		const sub = Record("hourSubmission", id)

		const wanted = await db.select<string[]>(sub).value("lapseTimelapses")

		if (wanted == null) return emptyHours("Submission not found.")
		if (wanted.length === 0) return emptyHours(null)

		const [owners] = await db.query<
			({ id: string; accessToken: string } | null)[][]
		>("SELECT VALUE lapseData FROM $sub<-submittedHours<-user", { sub })
		const lapse = owners?.[0]
		if (!lapse?.id || !lapse?.accessToken)
			return emptyHours("Submitter's Lapse account is not linked.")

		let all: { id: string; name: string; duration?: number }[]
		try {
			const response = await fetch(
				`https://api.lapse.hackclub.com/api/timelapse/findByUser?user=${encodeURIComponent(lapse.id)}`,
				{ headers: { Authorization: `Bearer ${lapse.accessToken}` } }
			)
			if (!response.ok)
				return emptyHours(
					response.status === 401
						? "Submitter's Lapse session has expired."
						: `Lapse API error (status ${response.status}).`
				)

			const body = await response.json()
			if (!body?.ok || !body?.data?.timelapses)
				return emptyHours("Lapse API returned an error.")
			all = body.data.timelapses
		} catch (e) {
			return emptyHours(
				e instanceof Error ? e.message : "Failed to fetch timelapses."
			)
		}

		const byId = new Map(all.map(t => [t.id, t]))
		const timelapses: SubmissionHoursResult["timelapses"] = []
		const missing: string[] = []
		for (const tid of wanted) {
			const t = byId.get(tid)
			if (t)
				timelapses.push({
					id: t.id,
					name: t.name,
					duration: t.duration ?? 0,
				})
			else missing.push(tid)
		}

		return {
			totalSeconds: timelapses.reduce((sum, t) => sum + t.duration, 0),
			found: timelapses.length,
			missing,
			timelapses,
			error: null,
		}
	}
)

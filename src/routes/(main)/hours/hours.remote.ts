import { error, invalid, isHttpError } from "@sveltejs/kit"
import { makeMessage, type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import { db } from "#lib/server/db.js"
import { LAPSE_TIMELAPSE_SINCE } from "$app/env/private"
import { form, query } from "$app/server"
import getLapseDataQuery from "../submit/getLapseData.surql?raw"
import createHourSubmissionQuery from "./createHourSubmission.surql?raw"
import listHourSubmissionsQuery from "./listHourSubmissions.surql?raw"

const messageTimelapseIds = makeMessage(
	"timelapseIds",
	"please select at least one timelapse"
)

const schema = type({
	"timelapseIds": type("string[] >= 1").configure(messageTimelapseIds[0]),
}).configure(...messageTimelapseIds)

type LapseTimelapse = {
	id: string
	name: string
	description: string
	visibility: string
	createdAt: number
	duration: number
	thumbnailUrl: string | null
	playbackUrl: string | null
}

export type TimelapsesResult = {
	error: string | null
	since: string
	timelapses: LapseTimelapse[]
}

/**
 * Fetches the calling user's timelapses from Lapse, filtered to those created since {@link LAPSE_TIMELAPSE_SINCE}. Throws on any failure (including an unlinked or expired Lapse account).
 */
async function fetchLapseTimelapses(user: User): Promise<LapseTimelapse[]> {
	const since = LAPSE_TIMELAPSE_SINCE
	const sinceMs = Date.parse(since)

	const [result] = await db.query<{ id: string; accessToken: string }[][]>(
		getLapseDataQuery,
		{ user: user.id }
	)
	const lapse = result?.[0]
	if (!lapse?.accessToken)
		error(401, "Please link your lapse account to submit a project!")

	const response = await fetch(
		`https://api.lapse.hackclub.com/api/timelapse/findByUser?user=${encodeURIComponent(lapse.id)}`,
		{ headers: { Authorization: `Bearer ${lapse.accessToken}` } }
	)

	if (!response.ok) {
		if (response.status === 401)
			throw new Error(
				"Your Lapse session has expired. Please re-link your Lapse account."
			)

		throw new Error(
			`Failed to fetch timelapses from Lapse (status ${response.status}).`
		)
	}

	const body = await response.json()
	if (!body?.ok || !body?.data?.timelapses)
		throw new Error(`Lapse API returned an error: ${JSON.stringify(body)}`)

	return (body.data.timelapses as LapseTimelapse[])
		.filter(t => t.createdAt >= sinceMs)
		.sort((a, b) => b.createdAt - a.createdAt)
		.map(
			({
				id,
				name,
				description,
				visibility,
				createdAt,
				duration,
				thumbnailUrl,
				playbackUrl,
			}) => ({
				id,
				name,
				description,
				visibility,
				createdAt,
				duration,
				thumbnailUrl,
				playbackUrl,
			})
		)
}

export const getTimelapses = query(async (): Promise<TimelapsesResult> => {
	const { user } = await authorise()

	const since = LAPSE_TIMELAPSE_SINCE

	try {
		const timelapses = await fetchLapseTimelapses(user)
		return { error: null, since, timelapses }
	} catch (e) {
		// An unlinked account throws an HttpError; let it surface as a 401.
		if (isHttpError(e)) throw e

		const message =
			e instanceof Error
				? e.message
				: "Failed to fetch timelapses from Lapse. Please try again."
		console.error("Failed to fetch Lapse timelapses:", e)

		return { error: message, since, timelapses: [] }
	}
})

export type HourSubmission = {
	id: string
	created: string
	hours: number
	status: string
	lapseIds: string[]
}

export const getMySubmissions = query(async (): Promise<HourSubmission[]> => {
	const { user } = await authorise()

	const [rows] = await db.query<HourSubmission[][]>(
		listHourSubmissionsQuery,
		{ owner: user.id }
	)

	return rows ?? []
})

export const submitHours = form(schema, async ({ timelapseIds }) => {
	const { user } = await authorise()

	let timelapses: LapseTimelapse[]
	try {
		timelapses = (await fetchLapseTimelapses(user)).filter(t =>
			timelapseIds.includes(t.id)
		)
	} catch (e) {
		const message =
			e instanceof Error
				? e.message
				: "Failed to fetch your timelapses. Please try again."
		invalid(message)
	}
	if (timelapses.length === 0) invalid("Please select at least one timelapse")

	const totalSeconds = timelapses.reduce((sum, t) => sum + (t.duration ?? 0), 0)
	const hours = totalSeconds / 3600

	await db.query(createHourSubmissionQuery, {
		owner: user.id,
		lapseIds: timelapseIds,
		hours,
	})

	return { hours, count: timelapses.length }
})
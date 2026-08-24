import fs from "node:fs"
import { error, invalid, isHttpError, redirect } from "@sveltejs/kit"
import sharp from "sharp"
import { makeMessage, type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import { db, type RecordId } from "#lib/server/db.js"
import { LAPSE_TIMELAPSE_SINCE } from "$app/env/private"
import { form, getRequestEvent, query } from "$app/server"
import createProjectQuery from "./createProject.surql?raw"
import getLapseDataQuery from "./getLapseData.surql?raw"
import getLatestProjectQuery from "./getLatestProject.surql?raw"

const messageName = makeMessage("name", "please give your project a name")
const messageDescription = makeMessage(
	"description",
	"please add a description of your project"
)
const messageCodeUrl = makeMessage(
	"codeUrl",
	"please provide a URL to your project's code"
)
const messagePlayableUrl = makeMessage(
	"playableUrl",
	"please provide a URL to your project's playable version"
)
const messageTimelapseIds = makeMessage(
	"timelapseIds",
	"please select at least one timelapse"
)

const schema = type({
	"image?": type("Blob").as<File>(),
	name: type("string >= 1").configure(messageName[0]),
	description: type("string >= 1").configure(messageDescription[0]),
	codeUrl: type("string >= 1").configure(messageCodeUrl[0]),
	playableUrl: type("string >= 1").configure(messagePlayableUrl[0]),
	"ai?": "boolean",
	"reviewerNotes?": "string",
	timelapseIds: type("string[] >= 1").configure(messageTimelapseIds[0]),
	"howHear?": "string",
	"howDoingWell?": "string",
	"howImprove?": "string",
	"howLikelyRecommend?": "(1 <= number.integer <= 10) | undefined",
})
	.configure(...messageName)
	.configure(...messageDescription)
	.configure(...messageCodeUrl)
	.configure(...messagePlayableUrl)
	.configure(...messageTimelapseIds)

export const newProjectForm = form(
	schema,
	async ({
		image,
		name,
		description,
		codeUrl,
		playableUrl,
		ai,
		reviewerNotes,
		howHear,
		howDoingWell,
		howImprove,
		howLikelyRecommend,
		timelapseIds,
	}) => {
		const { user } = await authorise()

		// Verify the selected timelapses total at least one hour of recorded time. Fetch fresh from Lapse so the check reflects current data.
		let selectedTimelapses: LapseTimelapse[]
		try {
			selectedTimelapses = (await fetchLapseTimelapses(user)).filter(t =>
				timelapseIds.includes(t.id)
			)
		} catch (e) {
			const message =
				e instanceof Error
					? e.message
					: "Failed to fetch your timelapses. Please try again."
			invalid(message)
		}
		const totalDuration = selectedTimelapses.reduce(
			(sum, t) => sum + (t.duration ?? 0),
			0
		)
		if (totalDuration < 3600)
			invalid(
				"Your selected timelapses must total at least 3600 seconds (1 hour) of recorded time."
			)

		// Only one project may be submitted per minute, measured from the last successful insert. This check runs before image compression so we don't waste CPU on rate-limited submissions.
		const [latestCreated] = await db.query<Date[]>(getLatestProjectQuery, {
			user,
		})
		console.log(latestCreated)
		if (latestCreated && Date.now() - latestCreated.getTime() < 60_000)
			invalid(
				"You've already submitted a project recently. Please wait a minute before submitting again."
			)

		// Process the uploaded image (if any) into a fixed-size AVIF, then content-address it by its SHA-256 hash so identical uploads share a single file on disk. The hash is stored on the project and used to serve the image later.
		let imageHash: string | undefined
		if (image && image.size > 0) {
			await fs.promises.mkdir("./data/images", { recursive: true })

			console.log("compressing")
			const bytes = await sharp(await image.arrayBuffer())
				.avif()
				.toBuffer()
			console.log("compresesd")

			imageHash = new Bun.CryptoHasher("sha256")
				.update(bytes)
				.digest("hex")
			console.log("hashed")

			const filePath = `./data/images/${imageHash}.avif`
			if (!fs.existsSync(filePath)) await Bun.write(filePath, bytes)
			console.log("written")
		}

		console.log("submitting")
		const submit = {
			user,
			image: imageHash ? { hash: imageHash } : undefined,
			name,
			description,
			codeUrl,
			playableUrl,
			ai: ai ?? false,
			reviewerNotes,
			howHear,
			howDoingWell,
			howImprove,
			howLikelyRecommend,
			timelapseIds,
		}

		const [, project] = await db.query<RecordId<"project">[]>(
			createProjectQuery,
			submit
		)

		console.log("created", project)

		const { cookies } = getRequestEvent()
		cookies.set("submitted", "true", { path: "/" })

		redirect(303, "/submitted")
	}
)

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

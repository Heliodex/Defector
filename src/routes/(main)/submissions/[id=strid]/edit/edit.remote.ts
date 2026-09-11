import fs from "node:fs"
import { error, invalid, redirect } from "@sveltejs/kit"
import sharp from "sharp"
import { makeMessage, type } from "#lib/arktype.js"
import { authorise } from "#lib/server/auth.js"
import { db, Record } from "#lib/server/db.js"
import { form, query } from "$app/server"
import getEditableSubmissionQuery from "./getEditableSubmission.surql?raw"
import updateHourSubmissionQuery from "./updateHourSubmission.surql?raw"

export type EditableSubmission = {
	id: string
	name: string
	description: string
	codeUrl: string
	ai: boolean
	image: { hash: string } | null
	status: string
	howHear?: string | null
	howDoingWell?: string | null
	howImprove?: string | null
	howLikelyRecommend: number
	reviewNotes?: string | null
}

/**
 * Loads one of the calling user's own submissions, provided it is marked "needschanges".
 * Throws 404 for unknown/foreign submissions and 403 for ones that aren't open for editing.
 */
export const getEditableSubmission = query(
	type.string,
	async (id: string): Promise<EditableSubmission> => {
		const { user } = await authorise()

		const [rows] = await db.query<EditableSubmission[][]>(
			getEditableSubmissionQuery,
			{ user: user.id, sub: Record("hourSubmission", id) }
		)

		const sub = rows?.[0]
		if (!sub) error(404, "Submission not found")
		if (sub.status !== "needschanges")
			error(403, "This submission can't be edited right now.")

		return sub
	}
)

const messageName = makeMessage("name", "please give your submission a name")
const messageDescription = makeMessage(
	"description",
	"please add a description of your submission"
)
const messageCodeUrl = makeMessage(
	"codeUrl",
	"please provide a URL to your submission's code"
)

// Timelapses and bots are intentionally absent: they were claimed when the submission was first
// created and can't be swapped during an edit.
const schema = type({
	id: "string",
	name: type("string >= 1").configure(messageName[0]),
	description: type("string >= 1").configure(messageDescription[0]),
	codeUrl: type("string >= 1").configure(messageCodeUrl[0]),
	"image?": type("Blob").as<File>(),
	"ai?": "boolean",
	"howHear?": "string",
	"howDoingWell?": "string",
	"howImprove?": "string",
	howLikelyRecommend: "0 <= number.integer <= 10",
})
	.configure(...messageName)
	.configure(...messageDescription)
	.configure(...messageCodeUrl)

export const updateSubmissionForm = form(
	schema,
	async ({
		id,
		image,
		name,
		description,
		codeUrl,
		ai,
		howHear,
		howDoingWell,
		howImprove,
		howLikelyRecommend,
	}) => {
		const { user } = await authorise()

		// Re-check ownership and status on submit, in case it changed since the page loaded.
		const [rows] = await db.query<EditableSubmission[][]>(
			getEditableSubmissionQuery,
			{ user: user.id, sub: Record("hourSubmission", id) }
		)
		const existing = rows?.[0]
		if (!existing) invalid("Submission not found.")
		if (existing.status !== "needschanges")
			invalid("This submission can't be edited right now.")

		// Keep the current image unless a new one was uploaded (file inputs can't be prefilled,
		// so an empty file input means "leave it as is").
		let imageRecord: { hash: string } | undefined = existing.image
			? { hash: existing.image.hash }
			: undefined

		if (image && image.size > 0) {
			if (image.size > 20e6)
				invalid("Image must be less than 20MB in size.")

			// Mirrors newSubmissionForm: compress to a fixed-size AVIF and content-address it by
			// its SHA-256 hash so identical uploads share a single file on disk.
			await fs.promises.mkdir("./data/images", { recursive: true })
			const bytes = await sharp(await image.arrayBuffer())
				.avif()
				.toBuffer()
			const hash = new Bun.CryptoHasher("sha256")
				.update(bytes)
				.digest("hex")

			const filePath = `./data/images/${hash}.avif`
			if (!fs.existsSync(filePath)) await Bun.write(filePath, bytes)
			imageRecord = { hash }
		}

		const [updated] = await db.query<unknown[][]>(
			updateHourSubmissionQuery,
			{
				id: Record("hourSubmission", id),
				user: user.id,
				name,
				description,
				codeUrl,
				ai: ai ?? false,
				howHear,
				howDoingWell,
				howImprove,
				howLikelyRecommend,
				image: imageRecord,
			}
		)

		if (!updated?.length)
			invalid("This submission can't be edited right now.")

		redirect(303, "/submissions")
	}
)

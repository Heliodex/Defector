import { error, type RequestEvent } from "@sveltejs/kit"
import { db } from "#lib/server/db.js"

// Publicly serves a submission image. Images are content addressed by the SHA-256 hash stored on the submission, so the route param is that hash. Only hashes belonging to an approved submission are served, so unapproved images can't be loaded and the endpoint can't probe for arbitrary files.
export async function GET({ params }: RequestEvent) {
	const { id } = params
	if (!id) error(400, "Missing image hash")

	const [rows] = await db.query<string[][]>(
		'SELECT VALUE image.hash FROM hourSubmission WHERE image.hash = $hash AND status = "approved" LIMIT 1',
		{ hash: id }
	)
	if (!rows?.[0]) error(404, "No image found for this submission")

	const file = Bun.file(`./data/images/${id}.avif`)
	if (!file.exists()) error(404, "No image found for this submission")

	return new Response(file, {
		headers: {
			"Content-Type": "image/avif",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	})
}

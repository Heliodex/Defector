import { error, type RequestEvent } from "@sveltejs/kit"
import { authorise } from "#lib/server/auth.js"
import { db } from "#lib/server/db.js"

// Serves the calling user's own project images stored on disk. Images are content addressed by the SHA-256 hash stored on the project record, so the route param is that hash. Ownership is checked so users can only view images from their own submissions (admins use /admin/images for all submissions).
export async function GET({ params }: RequestEvent) {
	const { user } = await authorise()

	const { id } = params
	if (!id) error(400, "Missing image hash")

	const [rows] = await db.query<string[][]>(
		"SELECT VALUE image.hash FROM $user->submittedHours->hourSubmission WHERE image.hash = $hash",
		{ user: user.id, hash: id }
	)
	if (!rows?.[0]) error(404, "No image found for this project")

	const file = Bun.file(`./data/images/${id}.avif`)
	if (!file.exists()) error(404, "No image found for this project")

	return new Response(file, {
		headers: {
			"Content-Type": "image/avif",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	})
}

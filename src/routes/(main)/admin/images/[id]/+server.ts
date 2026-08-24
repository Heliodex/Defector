import { error, type RequestEvent } from "@sveltejs/kit"
import { isAdmin } from "#lib/server/admin.js"

// Serves the processed project image stored on disk. Images are content addressed by the SHA-256 hash stored on the project record, so the route param is that hash.
export function GET({ locals, params }: RequestEvent) {
	if (!isAdmin(locals.user)) error(403, "Forbidden")

	const { id } = params
	if (!id) error(400, "Missing image hash")

	const file = Bun.file(`./data/images/${id}.avif`)
	if (!file.exists()) error(404, "No image found for this project")

	return new Response(file, {
		headers: {
			"Content-Type": "image/avif",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	})
}

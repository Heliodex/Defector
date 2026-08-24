import type { RequestEvent } from "@sveltejs/kit"
import { error, redirect } from "@sveltejs/kit"
import {
	authorise,
	exchangeLapseCodeForToken,
	fetchLapseUserInfo,
	linkLapseAccount,
} from "#lib/server/auth.js"
import { dev } from "$app/env"

export async function GET({ cookies, url }: RequestEvent) {
	const { user } = await authorise()

	// The provider redirects back here with `error` when the user denies consent
	// or something goes wrong during authorization.
	const authError = url.searchParams.get("error")
	if (authError) error(400, `Lapse authorization failed: ${authError}`)

	// Verify state to prevent CSRF
	const code = url.searchParams.get("code")
	if (!code) error(400, "Missing code")
	const state = url.searchParams.get("state")
	if (!state) error(400, "Missing state")
	const storedState = cookies.get("lapse_state")
	if (!storedState) error(400, "Missing cookie")
	if (state !== storedState) error(400, "Invalid state")
	const verifier = cookies.get("lapse_verifier")
	if (!verifier) error(400, "Missing verifier cookie")

	// Delete the state and verifier cookies
	cookies.delete("lapse_state", {})
	cookies.delete("lapse_verifier", {})

	try {
		const tokenResponse = await exchangeLapseCodeForToken(code, verifier)
		const userInfo = await fetchLapseUserInfo(tokenResponse.access_token)
		await linkLapseAccount(user.id, userInfo, tokenResponse)
	} catch (e) {
		console.error("Lapse OAuth callback error:", e)
		const message = e instanceof Error ? e.message : String(e)
		error(
			500,
			dev
				? `Lapse OAuth callback failed: ${message}`
				: "Lapse OAuth callback failed"
		)
	}

	redirect(302, "/home")
}

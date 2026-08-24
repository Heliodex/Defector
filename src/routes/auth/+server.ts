import type { RequestEvent } from "@sveltejs/kit"
import { error, redirect } from "@sveltejs/kit"
import {
	cookieName,
	cookieOptions,
	createSession,
	exchangeCodeForToken,
	fetchHackClubUserInfo,
	findOrCreateUser,
} from "#lib/server/auth.js"

export async function GET({ cookies, url }: RequestEvent) {
	// Verify state to prevent CSRF
	const code = url.searchParams.get("code")
	if (!code) error(400, "Missing code")
	const state = url.searchParams.get("state")
	if (!state) error(400, "Missing state")
	const storedState = cookies.get("hca_state")
	if (!storedState) error(400, "Missing cookie")
	if (state !== storedState) error(400, "Invalid state")

	// Delete the state cookie
	cookies.delete("hca_state", {})

	try {
		const tokenResponse = await exchangeCodeForToken(code)
		const userInfo = await fetchHackClubUserInfo(tokenResponse.access_token)
		const userId = await findOrCreateUser(userInfo)
		const session = await createSession(userId)

		cookies.set(cookieName, session, cookieOptions)
	} catch (e) {
		console.error("OAuth callback error:", e)
		error(500, "OAuth callback failed")
	}

	redirect(302, "/")
}

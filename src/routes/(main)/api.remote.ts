// Contains various api methods that cannot be accessed in a page context, usually because they are requested from a component.

import { redirect } from "@sveltejs/kit"
import {
	authorise,
	cookieName,
	generatePkcePair,
	getLapseAuthUrl,
	invalidateSession,
} from "#lib/server/auth.js"
import { db } from "#lib/server/db.js"
import { dev } from "$app/env"
import { form, getRequestEvent, query } from "$app/server"

export const logout = form(async () => {
	const { cookies } = getRequestEvent()
	const { session } = await authorise()

	await invalidateSession(session)
	cookies.delete(cookieName, {})

	redirect(302, "/")
})

export const lapseLogin = form(async () => {
	const { cookies } = getRequestEvent()

	const state = crypto.randomUUID()

	// Store the state and PKCE verifier in cookies for verification in the callback
	cookies.set("lapse_state", state, {
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: "lax",
		secure: !dev,
	})

	const { verifier, challenge } = await generatePkcePair()

	cookies.set("lapse_verifier", verifier, {
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: "lax",
		secure: !dev,
	})

	redirect(302, getLapseAuthUrl(state, challenge), { external: true })
})

type LapseProfile = {
	id: string
	handle: string
	displayName: string
	profilePictureUrl: string
}

export const getLapseData = query(async () => {
	const { user } = await authorise()

	// Only public profile fields are returned to the client — never the access/refresh tokens
	const [result] = await db.query<LapseProfile[][]>(
		"SELECT VALUE lapseData FROM $user",
		{ user: user.id }
	)
	const lapseData = result?.[0] ?? null
	if (!lapseData) return null

	return {
		id: lapseData.id,
		handle: lapseData.handle,
		displayName: lapseData.displayName,
		profilePictureUrl: lapseData.profilePictureUrl,
	}
})

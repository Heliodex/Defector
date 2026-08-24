import type { Cookies } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { db, Record, type RecordId } from "#lib/server/db.js"
import deleteExpiredSessionsQuery from "#lib/server/deleteExpiredSessions.surql?raw"
import deleteSessionQuery from "#lib/server/deleteSession.surql?raw"
import deleteUserSessionsQuery from "#lib/server/deleteUserSessions.surql?raw"
import findOrCreateUserQuery from "#lib/server/findOrCreateUser.surql?raw"
import getSessionAndUserQuery from "#lib/server/getSessionAndUser.surql?raw"
import linkLapseAccountQuery from "#lib/server/linkLapseAccount.surql?raw"
import setSessionQuery from "#lib/server/setSession.surql?raw"
import { dev } from "$app/env"
import {
	HACKCLUB_CLIENT_ID,
	HACKCLUB_CLIENT_SECRET,
	HACKCLUB_REDIRECT_URI,
	LAPSE_CLIENT_ID,
	LAPSE_CLIENT_SECRET,
	LAPSE_REDIRECT_URI,
} from "$app/env/private"
import { getRequestEvent } from "$app/server"

export async function createSession(user: RecordId<"user">): Promise<string> {
	const [, session] = await db.query<string[]>(setSessionQuery, { user })
	return session
}

type SessionValidationResult =
	| { session: string; user: User }
	| { session: null; user: null }

export async function validateSessionToken(
	token: string
): Promise<SessionValidationResult> {
	const [, , , res] = await db.query<SessionValidationResult[]>(
		getSessionAndUserQuery,
		{ sess: Record("session", token) }
	)
	if (!res.session || !res.user) return { session: null, user: null }
	return res
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.query(deleteExpiredSessionsQuery + deleteSessionQuery, {
		sess: Record("session", sessionId),
	})
}

export async function invalidateAllSessions(user: string): Promise<void> {
	await db.query(deleteExpiredSessionsQuery + deleteUserSessionsQuery, {
		user: Record("user", user),
	})
}

export const cookieName = "session"
export const cookieOptions = Object.freeze({
	secure: !dev,
	maxAge: 30 * 24 * 60 * 60, // 30 days
})

/**
 * Authorises a user and returns their session and user data, or redirects them to the login page.
 * @param locals the locals object, containing the user and their session.
 * @returns An object containing the session and user data. If the authorisation fails, it will redirect the user to /login.
 * @example
 * const { session, user } = await authorise(locals)
 */
export async function authorise() {
	const {
		locals: { session, user },
	} = getRequestEvent()

	if (!session || !user)
		// TODO: get session and user from getRequestEvent() locals
		redirect(302, "/")

	return { session, user }
}

/**
 * Generates the Hack Club OAuth authorization URL
 */
export function getHackClubAuthUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: HACKCLUB_CLIENT_ID,
		redirect_uri: HACKCLUB_REDIRECT_URI,
		response_type: "code",
		// "phone address birthdate" scopes are HQ-official only
		scope: "openid profile email slack_id verification_status",
		state,
	})
	return `https://auth.hackclub.com/oauth/authorize?${params.toString()}`
}

/**
 * Starts the Hack Club OAuth flow: stores a CSRF state cookie and redirects the
 * user to the Hack Club authorization URL.
 */
export function startHackClubAuth(cookies: Cookies): never {
	const state = crypto.randomUUID()

	cookies.set("hca_state", state, {
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: "lax",
		secure: !dev,
	})

	redirect(302, getHackClubAuthUrl(state), { external: true })
}

type HackClubTokenResponse = {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token: string
	scope: string
}

type HackClubUserInfo = {
	sub: string
	email: string
	email_verified?: boolean
	name?: string
	given_name?: string
	family_name?: string
	nickname?: string
	// HQ-official only (phone, birthdate, address scopes):
	// phone_number?: string
	// phone_number_verified?: boolean
	// birthdate?: string
	slack_id?: string
	verification_status?: string
	ysws_eligible?: boolean
	// address?: {
	// 	street_address?: string
	// 	locality?: string
	// 	region?: string
	// 	postal_code?: string
	// 	country?: string
	// }
}

/**
 * Exchanges an authorization code for an access token
 */
export async function exchangeCodeForToken(
	code: string
): Promise<HackClubTokenResponse> {
	const response = await fetch("https://auth.hackclub.com/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: HACKCLUB_CLIENT_ID,
			client_secret: HACKCLUB_CLIENT_SECRET,
			redirect_uri: HACKCLUB_REDIRECT_URI,
			code,
			grant_type: "authorization_code",
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to exchange code for token: ${error}`)
	}

	return response.json()
}

/**
 * Fetches user info from the Hack Club OIDC userinfo endpoint using the access token
 */
export async function fetchHackClubUserInfo(
	accessToken: string
): Promise<HackClubUserInfo> {
	const response = await fetch("https://auth.hackclub.com/oauth/userinfo", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to fetch user info: ${error}`)
	}

	return response.json()
}

/**
 * Finds or creates a user from Hack Club user info
 */
export async function findOrCreateUser(
	userInfo: HackClubUserInfo
): Promise<RecordId<"user">> {
	const {
		sub,
		email,
		name,
		given_name,
		family_name,
		nickname,
		email_verified,
		// HQ-official only (phone, birthdate, address scopes):
		// phone_number,
		// phone_number_verified,
		// birthdate,
		slack_id,
		verification_status,
		ysws_eligible,
		// address,
	} = userInfo

	const extraInfo = {
		name: name ?? "",
		givenName: given_name ?? "",
		familyName: family_name ?? "",
		nickname: nickname ?? "",
		emailVerified: email_verified ?? false,
		// HQ-official only:
		// phoneNumber: phone_number ?? "",
		// phoneNumberVerified: phone_number_verified ?? false,
		// birthdate: birthdate ?? "",
		slackId: slack_id ?? "",
		verificationStatus: verification_status ?? "",
		yswsEligible: ysws_eligible ?? false,
		// address: address
		// 	? {
		// 			streetAddress: address.street_address || null,
		// 			locality: address.locality || null,
		// 			region: address.region || null,
		// 			postalCode: address.postal_code || null,
		// 			country: address.country || null,
		// 		}
		// 	: null,
	}

	const [, userId] = await db.query<RecordId<"user">[]>(
		findOrCreateUserQuery,
		{
			hcid: sub,
			email,
			extraInfo,
		}
	)

	return userId
}

/**
 * Generates a PKCE verifier and its S256 code challenge
 */
export async function generatePkcePair(): Promise<{
	verifier: string
	challenge: string
}> {
	const verifier = crypto.randomUUID() + crypto.randomUUID()
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier)
	)
	const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")

	return { verifier, challenge }
}

/**
 * Generates the Lapse OAuth authorization URL
 */
export function getLapseAuthUrl(state: string, codeChallenge: string): string {
	const params = new URLSearchParams({
		client_id: LAPSE_CLIENT_ID,
		redirect_uri: LAPSE_REDIRECT_URI,
		response_type: "code",
		scope: "user:read",
		state,
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
	})
	return `https://api.lapse.hackclub.com/api/auth/authorize?${params.toString()}`
}

type LapseTokenResponse = {
	access_token: string
	refresh_token: string
	expires_in: number
	token_type: string
	scope: string
}

/**
 * Exchanges an authorization code for a Lapse access token
 */
export async function exchangeLapseCodeForToken(
	code: string,
	codeVerifier: string
): Promise<LapseTokenResponse> {
	const response = await fetch(
		"https://api.lapse.hackclub.com/api/auth/token",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: LAPSE_REDIRECT_URI,
				client_id: LAPSE_CLIENT_ID,
				client_secret: LAPSE_CLIENT_SECRET,
				code_verifier: codeVerifier,
			}),
		}
	)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to exchange Lapse code for token: ${error}`)
	}

	return response.json()
}

type LapseUserInfo = {
	id: string
	handle: string
	displayName: string
	profilePictureUrl: string
}

/**
 * Fetches the calling user's Lapse profile
 */
export async function fetchLapseUserInfo(
	accessToken: string
): Promise<LapseUserInfo> {
	const response = await fetch(
		"https://api.lapse.hackclub.com/api/user/myself",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}
	)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to fetch Lapse user info: ${error}`)
	}

	const body = await response.json()
	if (!body?.ok || !body?.data?.user) {
		throw new Error(`Lapse API returned an error: ${JSON.stringify(body)}`)
	}

	return body.data.user
}

/**
 * Links a Lapse account to an existing user
 */
export async function linkLapseAccount(
	user: RecordId<"user">,
	userInfo: LapseUserInfo,
	tokenResponse: LapseTokenResponse
): Promise<void> {
	const lapseData = {
		id: userInfo.id,
		handle: userInfo.handle,
		displayName: userInfo.displayName,
		profilePictureUrl: userInfo.profilePictureUrl,
		accessToken: tokenResponse.access_token,
		refreshToken: tokenResponse.refresh_token,
	}

	console.log("linking lapse account", lapseData)

	await db.query(linkLapseAccountQuery, {
		userId: user,
		lapseData,
	})
}

// "'Hooks' are app-wide functions you declare that SvelteKit will call in response to specific events, giving you fine-grained control over the framework's behaviour."
// See https://kit.svelte.dev/docs/hooks/ for more info.

import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit/hooks"
import pc from "picocolors"
import {
	cookieName,
	cookieOptions,
	validateSessionToken,
} from "#lib/server/auth.js"
import { reconnect } from "#lib/server/db.js"
import startSurreal from "#lib/server/process/surreal.js"

export const init: ServerInit = async () => {
	try {
		startSurreal()
	} catch (e) {
		console.log(e)
		console.error(
			"Failed to start SurrealDB. Make sure it is installed and accessible as `surreal`."
		)
		process.exit(1)
	}

	await reconnect()
}

const { magenta, red, yellow, green, blue, gray } = pc
const methodColours = Object.freeze({
	GET: green("GET"),
	POST: yellow("POST"),
})
const pathnameColours = Object.freeze({
	api: green,
	download: yellow,
	moderation: yellow,
	report: yellow,
	statistics: yellow,
	register: blue,
	login: blue,
	place: magenta,
	admin: red,
})

function pathnameColour(pathname: string) {
	for (const [prefix, colour] of Object.entries(pathnameColours))
		if (pathname.startsWith(`/${prefix}`)) return colour(pathname)

	return pathname
}

const time = () => gray(new Date().toLocaleString())

const userLog = (user: User | null) =>
	user ? blue(user.email) : yellow("Logged-out user")

const finish: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url
	const { user } = event.locals

	// Fancy logging: time(?), user, method, and path
	try {
		const method = event.request.method as keyof typeof methodColours

		console.log(
			time(),
			userLog(user),
			methodColours[method] || method,
			" ".repeat(7 - method.length),
			pathnameColour(decodeURI(pathname) + search)
		)
	} catch (e) {
		console.error("Could not log request:", e)
	}

	return await resolve(event)
}

// Ran every time a dynamic request is made.
// Requests for prerendered pages do not trigger this hook.
export const handle: Handle = async e => {
	const { event } = e

	const token = event.cookies.get(cookieName)
	if (!token) {
		event.locals.session = null
		event.locals.user = null
		event.cookies.delete(cookieName, { path: "/" })

		return await finish(e)
	}

	const { session, user } = await validateSessionToken(token)
	if (!session || !user) return await finish(e)

	event.locals.session = session
	event.locals.user = user
	event.cookies.set(cookieName, session, cookieOptions)

	return await finish(e)
}

export const handleError: HandleServerError = async ({ error: e }) => {
	if (typeof e !== "object" || e == null)
		// Simple error logging (not a stack trace)
		console.error(e)

	const status = (e as { status?: number }).status
	if (status) console.error(status, red(e?.toString()))
	console.error(e)
}

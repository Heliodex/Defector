import { isAdmin } from "#lib/server/admin.js"
import { startHackClubAuth } from "#lib/server/auth.js"
import { form, getRequestEvent, query } from "$app/server"

export const getLoggedIn = query(() => getRequestEvent().locals.user != null)

export const getIsAdmin = query(() => isAdmin(getRequestEvent().locals.user))

export const login = form(() => {
	const { cookies } = getRequestEvent()

	startHackClubAuth(cookies)
})

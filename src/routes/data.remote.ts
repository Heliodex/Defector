import { isAdmin } from "#lib/server/admin.js"
import { startHackClubAuth } from "#lib/server/auth.js"
import { db } from "#lib/server/db.js"
import { form, getRequestEvent, query } from "$app/server"

export const getLoggedIn = query(() => getRequestEvent().locals.user != null)

export const getIsAdmin = query(() => isAdmin(getRequestEvent().locals.user))

export const login = form(startHackClubAuth)

// payoff = [[R, S], [T, P]] where 0 = cooperate, 1 = defect:
// R = both cooperate, S = you cooperate / they defect, T = you defect / they cooperate, P = both defect
export type PayoffMatrix = [[number, number], [number, number]]

// Fetch the most recently seeded payoff matrix from the matrix table so the
// scores shown across the site always reflect the live tournament's matrix.
export const getLatestMatrix = query(async (): Promise<PayoffMatrix | null> => {
	const [rows] = await db.query<PayoffMatrix[][]>(
		"SELECT VALUE payoff FROM fn::latestMatrix()"
	)
	return rows?.[0] ?? null
})

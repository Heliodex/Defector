import { authorise } from "#lib/server/auth.js"
import { db } from "#lib/server/db.js"
import { query } from "$app/server"
import yourSubmissionsQuery from "./yourSubmissions.surql?raw"

type MySubmission = {
	id: string
	created: Date
	name: string
	description: string
	codeUrl: string
	ai: boolean
	image?: { hash: string; updated: Date }
	status: string
	lapseTimelapses: string[]
	bots?: { id: string; name: string }[] | null
	leaderboard?: {
		rankedCount: number
		bestRank: number | null
		multiplier: number
		bots: {
			bot: string
			name: string
			meanScore: number
			rank: number | null
			multiplier: number
		}[]
	} | null
	howLikelyRecommend?: number | null
	review?: { notes: string } | null
}

export const getYourSubmissions = query(async () => {
	const { user } = await authorise()

	const [rows] = await db.query<MySubmission[][]>(yourSubmissionsQuery, {
		user: user.id,
	})

	return (rows ?? []).map(sub => {
		const snapById = new Map(
			(sub.leaderboard?.bots ?? []).map(e => [e.bot, e])
		)
		return {
			...sub,
			// Format dates server-side so SSR and hydrated markup match
			created: new Date(sub.created).toLocaleString(),
			image: sub.image
				? {
						hash: sub.image.hash,
						updated: new Date(sub.image.updated).toLocaleString(),
					}
				: undefined,
			bots: (sub.bots ?? []).map(bot => ({
				...bot,
				rank: snapById.get(bot.id)?.rank ?? null,
				multiplier: snapById.get(bot.id)?.multiplier ?? 1,
			})),
		}
	})
})

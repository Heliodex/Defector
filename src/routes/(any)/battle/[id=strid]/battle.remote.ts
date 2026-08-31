import { error } from "@sveltejs/kit"
import { type } from "#lib/arktype.js"
import { db, Record } from "#lib/server/db.js"
import { query } from "$app/server"
import getBattleQuery from "./getBattle.surql?raw"

type BattleRow = {
	id: string
	created: Date
	scores: number[]
	eloDelta: number[]
	errors: (string | null)[]
	rounds: number[][]
	botNames: (string | null)[]
	botIds: (string | null)[]
}

export type Battle = {
	id: string
	created: Date
	scores: number[]
	eloDelta: number[]
	errors: (string | null)[]
	rounds: [string, string][]
	botNames: (string | null)[]
	botIds: (string | null)[]
	winnerIndex: 0 | 1 | null
}

export const getBattle = query(
	type.string,
	async (id: string): Promise<Battle> => {
		const battle = Record("battle", id)

		const [row] = await db.query<[BattleRow]>(getBattleQuery, { battle })
		if (!row) error(404, "Battle not found")

		// Each round is [aMove, bMove] where 0 = cooperate, 1 = defect.
		const rounds: [string, string][] = row.rounds.map(([a, b]) => [
			a === 1 ? "D" : "C",
			b === 1 ? "D" : "C",
		])

		const winnerIndex: 0 | 1 | null =
			row.scores[0] > row.scores[1]
				? 0
				: row.scores[1] > row.scores[0]
					? 1
					: null

		return {
			id: row.id,
			created: new Date(row.created),
			scores: row.scores.map(Number),
			eloDelta: row.eloDelta.map(Number),
			errors: row.errors,
			rounds,
			botNames: row.botNames,
			botIds: row.botIds,
			winnerIndex,
		}
	}
)

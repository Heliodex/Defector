import { type RecordId, type Surreal, Table } from "surrealdb"
import type { Memory, Move, State } from "./bots/bot"
import { callBot } from "./sandbox"

export type DBBot = {
	id: RecordId<"bot">
	codeHash: string
	latestCode: string
	name: string
}

export type MovePair = [Move, Move]

export type BattleResult = {
	rounds: MovePair[]
	errors: [string?, string?]
}

export function moveToInt(move: Move): number {
	if (move === "C") return 0
	if (move === "D") return 1
	throw new Error("Invalid move")
}

/**
 * Plays a full 100-round match between two bots entirely in memory,
 * threading each bot's memory and full history round-to-round. Throws an
 * error if either bot fails to return a valid [move, memory] tuple.
 */
export async function simulateBattle(
	bots: [DBBot, DBBot]
): Promise<BattleResult> {
	const states: [State, State] = [
		{ history: [], memory: null },
		{ history: [], memory: null },
	]
	const history: MovePair[] = []
	const errors: [string?, string?] = [undefined, undefined]

	// Variable number of rounds, though always at least 100
	const rounds = Math.floor(100 - 20 * Math.log(1 - Math.random()))

	for (let i = 0; i < rounds; i++) {
		const moves: MovePair = ["C", "C"]
		const memories: [Memory, Memory] = [null, null]
		let roundErrored = false

		for (let j = 0; j < bots.length; j++) {
			const bot = bots[j]
			if (!bot) throw new Error("Bot not found")
			const state = states[j]
			if (!state) throw new Error("State not found")

			let result: [Move, Memory]
			try {
				result = await callBot(bot, state)
			} catch (error) {
				errors[j] =
					error instanceof Error
						? error.message
						: JSON.stringify(error)
				roundErrored = true
				continue
			}
			const [move, memory] = result
			moves[j] = move
			memories[j] = memory
		}

		if (roundErrored) break

		states[0].memory = memories[0]
		states[1].memory = memories[1]
		states[0].history.push({ you: moves[0], opponent: moves[1] })
		states[1].history.push({ you: moves[1], opponent: moves[0] })
		history.push(moves)
	}

	return { rounds: history, errors }
}

/**
 * Plays a match and persists the resulting `battle` row. All scoring and Elo
 * computation is left to SurrealDB's computed fields.
 */
export async function runBattle(
	db: Surreal,
	bots: [DBBot, DBBot]
): Promise<void> {
	const { rounds: history, errors } = await simulateBattle(bots)

	await db.create(new Table("battle")).content({
		bots: bots.map(bot => bot.id),
		rounds: history.map(round => round.map(moveToInt)),
		errors,
	})
}

import type { Bot } from "./bot"

const bot: Bot = state => {
	const lastMove = state.history[state.history.length - 1]
	if (!lastMove) return ["C", state.memory]

	return [lastMove.opponent, state.memory]
}

export default bot

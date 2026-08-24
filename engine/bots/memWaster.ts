import type { Bot } from "./bot"

const bot: Bot = state => {
	const test = new Array(1_000_000).fill(50)

	return ["D", state.memory]
}

export default bot

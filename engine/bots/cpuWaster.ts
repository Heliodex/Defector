import type { Bot } from "./bot"

const bot: Bot = state => {
	while (true) {}

	return ["D", state.memory]
}

export default bot

import type { Bot } from "./bot"

const bot: Bot = state => {
	return [Math.random() > 0.5 ? "C" : "D", state.memory]
}

export default bot

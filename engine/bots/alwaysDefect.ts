import type { Bot } from "./bot"

const bot: Bot = state => {
	return ["D", state.memory]
}

export default bot

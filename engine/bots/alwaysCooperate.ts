import type { Bot } from "./bot"

const bot: Bot = state => {
	return ["C", state.memory]
}

export default bot

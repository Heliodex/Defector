import type { Bot } from "./bot"

const bot: Bot = state => {
	return ["E", state.memory]
}

export default bot

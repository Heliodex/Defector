import type { Bot } from "./bot"

const bot: Bot = state => {
	function test() {
		test()
	}

	return ["D", state.memory]
}

export default bot

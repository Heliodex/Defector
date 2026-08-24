import type { Bot } from "./bot"

const bot: Bot = state => {
	function test() {
		test()
	}

	test()
}

export default bot

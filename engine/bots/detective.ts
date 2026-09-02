export default function bot({ history, memory }) {
	const currentRound = history.length

	if (currentRound === 0) return ["C", null]
	if (currentRound === 1) return ["D", null]
	if (currentRound === 2) return ["C", null]

	if (memory == null) {
		const opp0 = history[0].opponent
		const opp1 = history[1].opponent
		const opp2 = history[2].opponent

		// if the opponent reacted to our defection, we'll cooperate with them
		if (opp0 === "C" && opp1 === "C" && opp2 === "D")
			memory = { strategy: "C" }
		else memory = { strategy: "D" }
	}

	return [memory.strategy, memory]
}

export type Move = "C" | "D"

export type Match = {
	you: Move
	opponent: Move
}

export type Memory = unknown

export type State = {
	// history being empty signifies that this is the first move
	history: Match[]
	memory: Memory
}

// A bot looks at its current state, modifies its memory, and makes a move
export type Bot = (state: State) => [Move, Memory]

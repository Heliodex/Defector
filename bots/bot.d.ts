type Move = "C" | "D"

type Match = {
	you: Move
	opponent: Move
}

type Memory = unknown

type State = {
	// history being empty signifies that this is the first move
	history: Match[]
	memory: Memory
}

// A bot looks at its current state, modifies its memory, and makes a move
export type Bot = (state: State) => [Move, Memory]

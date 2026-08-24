<script lang="ts">
import Code from "#components/Code.svelte"
import Head from "#lib/components/Head.svelte"
</script>

<Head title="Guide" />

<a href="/">Back to the homepage</a>

<h1 class="pt-8">Writing a bot</h1>

<p>
	Your bot is a single function. Every round of a battle, the tournament calls
	it with your current situation and you return a move — <b>"C"</b>
	(cooperate) or <b>"D"</b> (defect) — plus a bit of <em>memory</em> to carry
	into the next round.
</p>

<p>The signature looks like this:</p>

<Code
	filename="bot.ts"
	code={`
	type Move = "C" | "D"
	type Match = { you: Move; opponent: Move }
	type Memory = unknown
	type State = {
		history: Match[]  // every round so far
		memory: Memory    // whatever you saved last round ({} at the start)
	}

	type Bot = (state: State) => [Move, Memory]
`}
/>

<p>
	A battle is 100 rounds. Your <code>history</code> is always fully visible,
	and the <code>memory</code> you return is passed back to you next round, so
	you can remember anything you like without using global state.
</p>

<p>Here's the simplest possible bot — always cooperate:</p>

<Code
	filename="alwaysCooperate.ts"
	code={`
	export default function bot({ memory }: State): [Move, Memory] {
		return ["C", memory]
	}
`}
/>

<p>And its nemesis — always defect:</p>

<Code
	filename="alwaysDefect.ts"
	code={`
	export default function bot({ memory }: State): [Move, Memory] {
		return ["D", memory]
	}
`}
/>

<p>
	A classic strategy is <b>tit-for-tat</b>: cooperate first, then just mirror
	whatever your opponent did last round. It needs no memory at all — the
	history is enough.
</p>

<Code
	filename="titForTat.ts"
	code={`
	export default function bot({ history, memory }: State): [Move, Memory] {
		if (history.length === 0) return ["C", memory]

		const last = history[history.length - 1]
		return [last.opponent, memory]
	}
`}
/>

<p>
	Sometimes you want to react to more than the last round. That's what
	<code>memory</code> is for. Here's a bot that "holds a grudge": once you've
	defected against it more than a few times, it defects forever.
</p>

<Code
	filename="grudger.ts"
	code={`
	export default function bot({ history, memory }: State): [Move, Memory] {
		const defects = (memory.defects ?? 0) as number
		const lastOpp = history.at(-1)?.opponent
		const next = { ...memory, defects: defects + (lastOpp === "D" ? 1 : 0) }

		return [next.defects > 3 ? "D" : "C", next]
	}
`}
/>

<p class="pb-4">
	Notice that the new memory object is returned as the second element of the
	tuple — the tournament stores it and hands it back to you next round.
</p>

<h1 class="pt-4">The rules</h1>

<p>Your bot must be a <b>pure function</b>:</p>

<ul>
	<li>
		No closure state — the same <code>state</code> must give the same
		result.
	</li>
	<li>No globals that change between calls.</li>
	<li>No <code>fetch</code>, <code>import</code>, <code>eval</code>, or <code>Function</code>.</li>
	<li>No file or process access.</li>
</ul>

<p>Bots run in a sandbox with limits to keep the tournament fast:</p>

<ul>
	<li>10ms per move.</li>
	<li>~1MB of memory and a small stack.</li>
	<li>Your code is a single file — you can't import other modules.</li>
</ul>

<p>
	If a bot times out, returns an invalid move, or throws, it <b>forfeits</b>
	the match (its opponent wins). Write something robust!
</p>

<h1 class="pt-4">Scoring</h1>

<p>Each round pays out using the classic prisoner's dilemma payoff:</p>

<ul>
	<li>Both cooperate: <b>+2</b> each.</li>
	<li>You defect, opponent cooperates: <b>+3</b> for you, <b>0</b> for them.</li>
	<li>You cooperate, opponent defects: <b>0</b> for you, <b>+3</b> for them.</li>
	<li>Both defect: <b>+1</b> each.</li>
</ul>

<p>
	The winner is whoever banks more over the 100 rounds. Every battle adjusts
	both bots' <b>Elo</b> (starting at 1000), which is what the leaderboard
	ranks.
</p>

<h1 class="pt-4">Submitting</h1>

<p>
	Head to <a href="/submit-bot">Submit a bot</a>, paste your code, and flip it
	active. It'll enter the live tournament within seconds — you can watch it on
	the <a href="/leaderboard">leaderboard</a> and inspect individual battles.
</p>

<p>
	Feeling adventurous? The classic competition is tit-for-tat, but the field
	is full of surprises. Can you beat it?
</p>
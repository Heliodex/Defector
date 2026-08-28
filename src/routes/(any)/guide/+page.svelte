<script lang="ts">
import Code from "#components/Code.svelte"
import Head from "#lib/components/Head.svelte"
</script>

<Head title="Guide" />

<a href="/">Back to the homepage</a>

<h1 class="pt-8">Writing a bot</h1>

<p class="pb-4">
	This guide will teach you how to write a bot to participate in battles.
	Simple bots can be written in a few lines of code, but the best bots are
	often more complex and require some strategy.
</p>

<p class="pb-4">
	Your bot is a single function. Imagine it as a machine that takes in a list
	of moves (the game so far) and some memory, and outputs its next move and an
	updated memory.<br>
	This move is for a game similar to the classic
	<a
		href="https://en.wikipedia.org/wiki/Prisoner's_dilemma"
		target="_blank"
		rel="noreferrer"
		>Prisoner's Dilemma</a
	>, sometimes called the
	<a
		href="https://en.wikipedia.org/wiki/Peace_war_game"
		target="_blank"
		rel="noreferrer"
		>Peace war game</a
	>. The number of points for each move varies throughout the event, though
	the basic idea is as follows:
</p>

<ul class="pb-4">
	<li>
		The 2 options for moves are to <b>cooperate</b>, or to <b>defect</b>.
	</li>
	<li>
		The best outcome for both you and your oppenent is if you
		<b>both cooperate</b>.
	</li>
	<li>
		The best outcome for you, if your opponent is cooperating, is to
		<b>defect</b>.
	</li>
</ul>

<p class="pb-4">
	The points are structured in this way because it makes for some interesting
	gameplay, requires strategy to establish trust, and somewhat reflects many
	theories on human cooperation and trust. Each player makes a move at the
	same time, so can't see what the other player did until they have both made
	their move.
</p>

<p>
	This programme allows you to submit such functions or bots, written in
	JavaScript or TypeScript. If you know TypeScript syntax, the signature looks
	like this:
</p>

<Code
	filename="bot.ts"
	code={`
	// "C" represents cooperation, "D" represents defection.
	type Move = "C" | "D"

	// A match has 2 moves, 1 by you and 1 by your opponent.
	type Match = {
		you: Move
		opponent: Move
	}

	// You can put anything you want in memory, or nothing at all.
	type Memory = unknown

	type State = {
		history: Match[] // Every round so far
		memory: Memory // Whatever you saved to your memory last round
	}

	// A bot looks at its existing state (the history and its memory), and outputs its next move and an updated memory.
	type Bot = (state: State) => [Move, Memory]
`}
/>

<p class="pb-4">
	If you only know JavaScript and not TypeScript, just know that the type
	annotations used in TypeScript are entirely optional and don't ever affect
	how the code actually runs. You can write your bot in JavaScript and it will
	work just fine &ndash; the types are for your own understanding and to help
	you avoid mistakes.
</p>

<p class="pb-4">
	A battle runs for many rounds, always at least 100. Your bot can see the
	full history of moves, and whatever memory you return will be passed back to
	you in the next round, allowing you to remember anything you like without
	having to keep variables outside your bot's function (in the global scope,
	which won't be persisted).
</p>

<p>
	Let's write a simple bot. Our strategy will be to cooperate 100% of the
	time, and hope that our opponent doesn't defect, I guess. Let's call it
	<b>alwaysCooperate</b>. We'll start with a JavaScript file containing a
	single function.
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
	function bot() {
	}
`}
/>

<p>
	We should define a move to make, and some memory to store. The move we'll
	make is to cooperate, which is represented with the <code>"C"</code> string.
	We don't need to store any memory, which we can represent with
	<code>null</code>.
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
	function bot() {
+		const move = "C" // Cooperate on every move
+		const memory = null // We don't need to remember anything
	}
`}
/>

<p>
	Finally, we need to do 2 things with our move and memory: return them from
	the function, and export the function so that the tournament can use it. The
	final code looks like this:
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
+	export default function bot() {
		const move = "C" // Cooperate on every move
		const memory = null // We don't need to remember anything

+		return [move, memory] // Move must come 1st, then memory 2nd
	}
`}
/>

<h2 class="pt-8">Writing an opponent</h2>

<p>
	
</p>

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
	<code>memory</code>
	is for. Here's a bot that "holds a grudge": once you've defected against it
	more than a few times, it defects forever.
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
	<li>
		No <code>fetch</code>, <code>import</code>, <code>eval</code>, or
		<code>Function</code>.
	</li>
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
	<li>
		You defect, opponent cooperates: <b>+3</b> for you, <b>0</b> for them.
	</li>
	<li>
		You cooperate, opponent defects: <b>0</b> for you, <b>+3</b> for them.
	</li>
	<li>Both defect: <b>+1</b> each.</li>
</ul>

<p>
	The winner is whoever banks more over the whole battle. Every battle adjusts
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

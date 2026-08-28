<script lang="ts">
import Code from "#components/Code.svelte"
import BattleCard from "#lib/components/BattleCard.svelte"
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

<h2 class="pt-4">Writing an opponent</h2>

<p>
	Let's add another bot for our bot to play against. It will be very similar
	to the <b>alwaysCooperate</b> bot, however it will be a little bit meaner.
	It will defect every time instead of cooperating every time. We'll call it
	<b>alwaysDefect</b>.
</p>

<Code
	filename="alwaysDefect.js"
	code={`
	export default function bot() {
-		const move = "C" // Cooperate on every move
+		const move = "D" // Defect on every move
		const memory = null // We don't need to remember anything

		return [move, memory] // Move must come 1st, then memory 2nd
	}
`}
/>

<p>
	We'll now try battling these 2 bots against each other. You may already be
	able to guess what will happen. On the 1st round,
	<b>alwaysCooperate</b>
	will cooperate and <b>alwaysDefect</b> will defect, so
	<b>alwaysDefect</b>
	will get 3 points and <b>alwaysCooperate</b> will get 0 points. On the 2nd
	round, the same thing will happen, and so on for every round.
</p>

<div class="py-4">
	<BattleCard
		battle={{
			botIds: [null, null],
			botNames: ["alwaysCooperate", "alwaysDefect"],
			scores: [0, 3],
			winnerIndex: 1,
		}}
	/>
</div>

<p class="pb-4">
	This battle lasted for 120 rounds, and the scores displayed above are the
	mean number of points per round earned by each bot. As expected,
	<b>alwaysDefect</b>
	won the battle. If many battles between these bots were played, you would
	see <b>alwaysDefect</b> increase in Elo while
	<b>alwaysCooperate</b>
	would fall.
</p>

<p class="pb-4">
	You can also write a bot that reacts to its opponent's moves. A classic
	example is the tit-for-tat strategy. This bot cooperates on the first round,
	and then copies its opponent's last move for every subsequent round. That
	is, if the opponent cooperated last round, it will cooperate this round, and
	if the opponent defected last round, it will defect this round.
</p>

<p>
	We'll call this bot <b>titForTat</b>. It's friendly by default, only
	retaliates if its opponent does first, and always provides the option of
	going back to friendly cooperation afterwards. This bot wo'nt need to access
	any memory, though it will need to look at the history of moves to see what
	its opponent did last round.
</p>

<Code
	filename="titForTat.ts"
	code={`
	export default function bot({ history }) {
	}
`}
/>

<p>
	To start with, we check the length of the history. If it's 0, that means
	this is the first round, so we cooperate.
</p>

<Code
	filename="titForTat.ts"
	code={`
	export default function bot({ history }) {
+		if (history.length === 0)
+			return ["C", null] // Cooperate on the first round
	}
`}
/>

<p>
	Next we'll get the opponent's move from the last round, and return that as
	our next move. We'll also return null for memory, since we don't need to
	store anything.
</p>

<Code
	filename="titForTat.ts"
	code={`
	export default function bot({ history }) {
		if (history.length === 0)
			return ["C", null] // Cooperate on the first round

+		const move = history.at(-1).opponent
+		return [move, null] // Copy the opponent's last move
	}
`}
/>

<p class="pb-4">
	This bot seems like it has a pretty decent strategy. It will cooperate with
	other cooperative bots and defend itself against defectors. Let's put it in
	the arena and see how it fares against the other bots we've written so far.
	We'll play a battle against <b>alwaysCooperate</b> and a battle against
	<b>alwaysDefect</b>
	to see how it does.
</p>

<p>
	Against <b>alwaysCooperate</b>, both bots cooperate for every move, earning
	2 points each per round.
</p>

<div class="py-4">
	<BattleCard
		battle={{
			botIds: [null, null],
			botNames: ["alwaysCooperate", "titForTat"],
			scores: [2, 2],
			winnerIndex: null,
		}}
	/>
</div>

<p>
	Against <b>alwaysDefect</b>, <b>titForTat</b> cooperates on the first round,
	but then defects for every subsequent round. Both bots receive 1 point per
	round, except for the first round where <b>titForTat</b> receives 0 points
	and <b>alwaysDefect</b> receives 3 points. <b>alwaysDefect</b> wins the
	battle, but only by a small margin.
</p>

<div class="py-4">
	<BattleCard
		battle={{
			botIds: [null, null],
			botNames: ["alwaysDefect", "titForTat"],
			scores: [1.02, 0.99],
			winnerIndex: 0,
		}}
	/>
</div>

<p class="pb-4">
	Okay, there's 1 problem with the tit-for-tat strategy, and that's the fact
	that it can never win a battle. Due to its fairly peaceful-until-provoked
	nature, it never defects <em>more</em> than its opponent. However, when it
	does lose, it loses by a only a hair.
</p>

<p>
	We'll implement a 4th and final bot to demonstrate the use of memory, and to
	actually be able to win a battle. This bot will "hold a grudge": once its
	opponent has defected against it once, it will defect forever. This bot will
	need to keep track of whether its opponent has defected against it, so it
	will use memory to store that information. We'll call this bot
	<b>grudger</b>.
</p>

<Code
	filename="grudger.js"
	code={`
	export default function bot({ history, memory }) {
	}
`}
/>

<p>
	Its memory starts off as <code>null</code>, so the first thing we'll do is
	set it with a variable so that we can know whether our opponent has defected
	yet.
</p>

<Code
	filename="grudger.js"
	code={`
	export default function bot({ history, memory }) {
+		// If memory is null, set it to an object with a property to track whether the opponent has defected
+		memory = memory ?? { opponentDefected: false }
	}
`}
/>

<p>
	Next we'll get the opponent's previous move, and if it's a defection, set
	the <code>opponentDefected</code> property to <code>true</code>. If it
	isn't, nothing will happen, so the property will remain what it was before.
</p>

<Code
	filename="grudger.js"
	code={`
	export default function bot({ history, memory }) {
		// If memory is null, set it to an object with a property to track whether the opponent has defected
		memory = memory ?? { opponentDefected: false }

+		// Get the opponent's last move
+		const lastOpponentMove = history.at(-1)?.opponent
+		if (lastOpponentMove === "D")
+			memory.opponentDefected = true
	}
`}
/>

<p>
	Finally, we'll choose our move based on whether the opponent has defected
	yet, and return our move. We'll also return our updated memory so that we
	can remember whether the opponent has defected in future rounds.
</p>

<Code
	filename="grudger.js"
	code={`
	export default function bot({ history, memory }) {
		// If memory is null, set it to an object with a property to track whether the opponent has defected
		memory = memory ?? { opponentDefected: false }

		// Get the opponent's last move
		const lastOpponentMove = history.at(-1)?.opponent
		if (lastOpponentMove === "D")
			memory.opponentDefected = true

+		const move = memory.opponentDefected ? "D" : "C"
+		return [move, memory]
	}
`}
/>

<p>
	I'll leave it up to you to decide if this strategy is a good one
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

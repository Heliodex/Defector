<script lang="ts">
import Code from "#components/Code.svelte"
import Head from "#lib/components/Head.svelte"
import diagram from "./diagram.svg"

const guideName = "JavaScript for bots"
</script>

<Head title="Guide - {guideName}" />

<h1 class="pt-8">{guideName}</h1>

<p class="pb-4">
	<!-- This guide will teach you how to write a bot to participate in battles.
	Simple bots can be written in a few lines of code, but the best bots are
	often more complex and require some strategy. -->
	This guide will teach you the constructs used in writing bots for the
	competition. We'll do this by introducing simple example bots and dissecting
	their code.<br>
	The primary audience for this guide is people who are already familiar with
	programming languages other than JavaScript.
</p>

<p>
	Here's one of the simplest bots &ndash; it always cooperates with its
	opponent.
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
	export default function bot() {
		const move = "C"
		const memory = null

		return [move, memory]
	}
`}
/>

<p class="pb-4">
	Bots have to be written in a specific way. They are run by a competition
	engine, which needs to be able to understand how to talk with your bot. This
	bot consists of 1 <b>function</b>. Functions, like in most programming
	languages, allow you to group together a set of instructions and give them a
	name. Additionally, they can define some parameters which they may take as
	input, and they can return a value.
</p>

<p>
	Highlighted below is the beginning and end of the function. This one is
	named <code>bot</code>, and the empty set of parentheses after the name
	indicate that it defines no parameters, and thus takes no arguments as
	input.
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
~	export default function bot() {
		const move = "C"
		const memory = null

		return [move, memory]
~	}
`}
/>

<p class="pb-4">
	2 keywords are placed before the definition of the function. The
	<code>export</code> keyword is used to make the function available to some
	other code outside of the file &ndash; in this case, that will be the
	competition engine, which needs to be able to call (run) your bot. The
	<code>default</code> keyword is used to indicate that this is the
	primary/only exported function of the file.
</p>

<p>
	The function doesn't have to be called <code>bot</code> for the competition
	engine to be able to access it. It does, however, need to be exported and
	available as the default function. There are a few different ways to declare
	and export a function in JavaScript:
</p>

<Code
	filename="exports.js"
	code={`
	// As is done in most of our examples
	export default function bot() {
	}

	// As an unnamed or "anonymous" function
	export default function() {
	}

	// Declaring the function, and then exporting it later
	function bot() {
	}

	export default bot

	// Using short definition syntax, \`() => {}\` instead of \`function() {}\`
	// Often called "arrow functions" due to the \`=>\`
	export default () => {
	}
`}
/>

<p>
	Oh yeah, also comments are written starting with <code>//</code> for single-line comments, which extend to the end of the line.<br />
	We'll stick to the 1st style in these guides for coherence, though you can
	use whichever you prefer. Next, there are some constant declarations:
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
	export default function bot() {
~		const move = "C"
~		const memory = null

		return [move, memory]
	}
`}
/>

<p class="pb-4">
	Each declaration consists of the declaration keyword (in this case
	<code>const</code>), followed by a variable name and a value to assign to
	it. The 1st, <code>move</code>, has the value of <code>"C"</code>, a string
	of 1 character. The 2nd, <code>memory</code>, has the value of
	<code>null</code>. <code>null</code> is a special value in JavaScript that
	indicates an explicit absence of a value. <br>
	<code>null</code>
	can often be confused with <code>undefined</code>, which indicates an
	<em>implicit</em> absence of a value. Not many other programming languages
	have this distinction. Fun!
</p>

<p class="pb-4">
	There are also a few ways to declare constants and variables in JavaScript.
	These are <code>const</code> and <code>let</code>. The difference is that
	<code>const</code> does not allow for reassigning a value to the variable,
	while <code>let</code> does. We've used <code>const</code> here because we
	don't need to change the values of <code>move</code> or
	<code>memory</code> after they are assigned.
</p>

<p>
	Finally, there's a return value, preceded by the
	<code>return</code> keyword. In JavaScript, functions don't have to return
	anything, though if we omitted this then our bot wouldn't be able to make a
	move.
</p>

<Code
	filename="alwaysCooperate.js"
	code={`
	export default function bot() {
		const move = "C"
		const memory = null

~		return [move, memory]
	}
`}
/>

<p class="pb-4">
	Arrays in JavaScript are delimited by square brackets
	<code>[]</code> (similar to what's sometimes called "lists" or "vectors" in
	other programming languages). The competition engine expects your bot to
	return an array with 2 elements: the 1st being the move to make, either
	<code>"C"</code> for cooperation or <code>"D"</code> for defection, and the
	2nd being the memory to pass to your bot on its next turn. We add the
	constants <code>move</code> and <code>memory</code> to the array in their
	respective places. It doesn't matter what the constants are named, just
	their order in the returned array.
</p>

<p class="pb-4">
	The competition engine will run this bot, and it will receive the value
	<code>["C", null]</code> in return. It then keeps track of the move the bot
	wants to make, and stores the memory value. The bot is then rerun on the
	next round.
</p>

<p>
	Alongside your bot, the competition engine will also run your opponent's
	bot. So what's the deal with the memory? And how can your bot access the
	moves your opponent has made?
</p>

<h2 class="pt-4">A more advanced bot</h2>

<p>
	The following is an implementation of a strategy that tests its opponent,
	and tries to either exploit its opponent or cooperate based on the
	opponent's response. Because of this, strategies of this family are
	sometimes called "detectives".
</p>

<Code
	filename="detective.js"
	code={`
	export default function bot({ history, memory }) {
		const currentRound = history.length

		if (currentRound == 0) return ["C", null]
		if (currentRound == 1) return ["D", null]
		if (currentRound == 2) return ["C", null]

		if (!memory) {
			const opp0 = history[0].opponent
			const opp1 = history[1].opponent
			const opp2 = history[2].opponent

			// if the opponent reacted to our defection, we'll cooperate with them
			if (opp0 == "C" && opp1 == "C" && opp2 == "D")
				memory = { strategy: "C" }
			else
				memory = { strategy: "D" }
		}

		return [memory.strategy, memory]
	}
`}
/>

<p class="pb-4">
	Let's break this down. The first line is the same as usual, declaring a
	function, though it includes 1 parameter. This parameter is the state, and
	it's <em>destructured</em> into its component parts, which are the battle
	history and the bot's memory.
</p>

<p>The first line could instead be written as follows:</p>

<Code
	filename="detective.js"
	code={`
-	export default function bot({ history, memory }) {
+	export default function bot(state) {
+		const history = state.history
+		const memory = state.memory

		// or, alternatively,
+		const { history, memory } = state

		// ...
	}
`}
/>

<p class="pb-4">
	The history includes a list of moves by us and our opponent. We'll explore the format of the moves in a little bit, though for now we can find out which round of the battle we're on by looking at the length of this history.
</p>

<p>
	We'll start with a simple test: cooperate, defect, cooperate &ndash; and we'll do this by checking the current round and making a move based on that for the first 3 rounds.
</p>

<Code
	filename="detective.js"
	code={`
	export default function bot({ history, memory }) {
~		const currentRound = history.length

~		if (currentRound == 0) return ["C", null]
~		if (currentRound == 1) return ["D", null]
~		if (currentRound == 2) return ["C", null]

		// ...
	}
`}
/>

<p>
	So here, the <code>currentRound</code> constant holds the length of the battle history, which will be 0 if it's empty.
</p>
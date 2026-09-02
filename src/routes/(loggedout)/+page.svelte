<script lang="ts">
import Accordion from "#components/Accordion.svelte"
import AccordionItem from "#components/AccordionItem.svelte"
import Head from "#components/Head.svelte"
import chessboard from "#lib/assets/chessboard.png"
import { programmeName, siteDescription, siteUrl } from "#lib/assets/config.js"
import logo from "#lib/assets/logo.svg"
import { getLatestMatrix, login } from "../data.remote"

const matrix = $derived(await getLatestMatrix())
const R = $derived(matrix?.[0][0])
const S = $derived(matrix?.[0][1])
const T = $derived(matrix?.[1][0])
const P = $derived(matrix?.[1][1])
</script>

<Head
	title="Iterated Prisoner's Dilemma bot competition"
	description="Defector is a free Hack Club competition: write a bot that plays a Prisoner's Dilemma-like strategy game, battle other bots on a live Elo leaderboard, and win video game grants. Every few seconds two bots battle and the winner climbs the ladder."
	schema={{
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": programmeName,
		url: siteUrl,
		description: siteDescription,
		inLanguage: "en-GB",
		publisher: {
			"@type": "Organization",
			name: "Hack Club",
			url: "https://hackclub.com/",
		},
	}}
/>

<a href="https://hackclub.com/" target="_blank" rel="noreferrer">
	<img
		id="hc"
		class="absolute top-0 lg:left-44 border-0 w-32 z-999"
		src="https://assets.hackclub.com/flag-orpheus-top.svg"
		alt="Hack Club"
	>
</a>

<div class="text-center pb-8 flex flex-col items-center">
	<img src={logo} alt="{programmeName} logo" class="w-24">

	<h1 class="text-6xl! pb-0!">{programmeName}</h1>
	<p class="text-center pb-8">
		a Prisoner's Dilemma-like competition<br>
		by
		<a
			href="https://hackclub.enterprise.slack.com/team/U07JH9LU1NC"
			target="_blank"
			rel="noreferrer"
			>@Heliodex</a
		>
		at
		<a href="https://hackclub.com" target="_blank" rel="noreferrer"
			>Hack Club</a
		>
	</p>
	<p class="max-w-120 pb-4">
		Write a bot that plays a strategy game, battle other bots,<br>
		and win money to spend on video games!
	</p>
	<p class="max-w-120">
		Every few seconds 2 bots battle, and the winner climbs the leaderboard.
	</p>
</div>

<div class="flex items-center justify-center gap-4">
	<form {...login}>
		<button class="btn btn-primary" type="submit">Log in</button>
	</form>
	<a href="/leaderboard" class="btn btn-secondary"> Live leaderboard </a>
</div>

<h2 class="pt-12 text-center">How it works</h2>
<p class="pb-4">
	You write a tiny function that, given your history with an opponent, picks a
	move: <b>cooperate (C)</b> or <b>defect (D)</b>. Your bot gets a new
	opponent every battle and earns points per round. Better bots win more
	battles and climb the Elo ladder.
</p>

<ul>
	<li>Write a bot in TypeScript or JavaScript, no frameworks needed.</li>
	<li>You may have up to 3 active bots in the live tournament at once.</li>
	<li>
		Your bots' Elo starts at 1000 and updates automatically after each
		battle.
	</li>
</ul>

<p class="pt-4 pb-8">
	See the <a href="/guide">Guide</a> for bot examples, and how to write a bot
	in 3 lines of code.
</p>

<p>
	Want to know how it works under the hood? The tournament is an
	<a
		href="https://en.wikipedia.org/wiki/Prisoner's_dilemma#The_iterated_prisoner's_dilemma"
		target="_blank"
		rel="noreferrer"
		>Iterated Prisoner's Dilemma</a
	>: in each round both you and your opponent choose to cooperate or defect.
</p>

{#if matrix}
	<ul>
		<li>If you both cooperate you each get {R} points.</li>
		<li>If you both defect you each get {P} points.</li>
		<li>
			If one of you defects while the other cooperates, the defector gets
			{T}
			points and the other gets {S}.
		</li>
	</ul>

	<p>
		This makes the payoff matrix (how many points you get for each move)
		look like this:
	</p>

	<div class="py-4">
		<table class="mx-auto shadowcard">
			<thead>
				<tr>
					<th class="font-normal">You →<br>Opponent ↓</th>
					<th>Cooperate</th>
					<th>Defect</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="font-bold">Cooperate</td>
					<td>{R}, {R}</td>
					<td>{S}, {T}</td>
				</tr>
				<tr>
					<td class="font-bold">Defect</td>
					<td>{T}, {S}</td>
					<td>{P}, {P}</td>
				</tr>
			</tbody>
		</table>
	</div>
{/if}

<p>
	Over at least 100 rounds, the accumulated score decides the winner. Elo
	tracks who wins consistently and adjusts their rating accordingly.
</p>

<p class="pt-4">
	<b
		>Track your time spent with
		<a href="https://lapse.hackclub.com/" target="_blank" rel="noreferrer"
			>Lapse</a
		>
		so we can verify it for your rewards!</b
	>
	The base rate is $4 in grants (spendable at various video game vendors) per
	verifiable hour tracked building bots. The higher your bots rank on the
	leaderboard, the more you can earn!
</p>

<div id="faq" class="pb-24">
	<h2 class="pt-12 pb-4 text-center">Frequently Asked Questions</h2>

	<div class="mx-auto max-w-150 pb-8">
		<Accordion class="flex flex-col gap-4">
			<AccordionItem title="Who's eligible to join?">
				The event is intended for high school students of any experience
				level. Anyone aged 13-18 is eligible to participate.
				<br>
				19 or over? Get the same prizes by
				<a
					href="https://pyramid.hackclub.com"
					target="_blank"
					rel="noreferrer"
				>
					referring others!
				</a>
			</AccordionItem>

			<AccordionItem title="Do I need to know how to code JavaScript?">
				Nope! The <a href="/guide">Guide</a> will walk you through the
				basics of writing a bot. It starts with the simplest bots, only
				a few lines of code, then gradually shows how to build bots with
				more advanced strategy.
			</AccordionItem>

			<AccordionItem title="Do I need to know game theory?">
				Not at all. The simplest bots are only a few lines of code, and
				you can iterate and deploy new bots throughout the programme,
				while seeing what works and what doesn't.
				<br>
				<br>
				If you don't know game theory now, you will by the end of the
				programme! If you want to learn the easy way, check out the
				<a href="/guide">Guide</a>.
			</AccordionItem>

			<AccordionItem title="What are the prizes?">
				Everyone who verifiably spends time gets video game grants or
				gift cards as a reward. Based on leaderboard position and how
				many matches your bots play, your grants may be larger!
			</AccordionItem>

			<AccordionItem title="How much does it cost to join in?">
				{programmeName}
				is completely free to join and participate in. All prizes are
				provided by us. All you need is a
				<a
					href="https://auth.hackclub.com/welcome"
					target="_blank"
					rel="noreferrer"
				>
					Hack Club Auth
				</a>
				account to log in and participate.
			</AccordionItem>

			<AccordionItem title="Who runs this?">
				{programmeName}
				is sponsored by
				<a href="https://hackclub.com" target="_blank" rel="noreferrer">
					Hack Club,
				</a>
				a US-based 501(c)(3) non-profit organisation. Hack Club aims to
				incentivise high schoolers all over the world to advance their
				programming skills and ship their projects.
				<br>
				<br>
				We think you learn best when you're building, so we provide the
				useful resources and the amazing community to help you do that.
				We make, break, learn, and share projects together. Welcome to
				the club!
			</AccordionItem>
		</Accordion>
	</div>
</div>

<div
	id="chessboard"
	role="img"
	aria-label="Chessboard"
	class="-mb-20"
	style="--chessboard-bg: url({chessboard})"
></div>

<style>
#hc:hover {
	animation: rotate 0.75s ease-in-out;
	animation-iteration-count: 2;
}

@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	50% {
		transform: rotate(-3deg) translate(2px, -3px);
	}
	to {
		transform: rotate(0deg);
	}
}

#chessboard {
	background-image: var(--chessboard-bg);
	background-size: cover;
	background-position: center;
	aspect-ratio: 2560 / 1206;
	/* Fade out only the left and right edges into the page background */
	mask-image: linear-gradient(
		to right,
		transparent,
		black 10%,
		black 90%,
		transparent
	);
}
</style>

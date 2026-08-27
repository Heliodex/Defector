<script lang="ts">
import Accordion from "#components/Accordion.svelte"
import AccordionItem from "#components/AccordionItem.svelte"
import Head from "#components/Head.svelte"
import chessboard from "#lib/assets/chessboard.png"
import { programmeName } from "#lib/assets/config.js"
import logo from "#lib/assets/logo.svg"
import { login } from "../data.remote"
</script>

<Head />

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
	You write a tiny pure function that, given your history with an opponent,
	picks a move: <b>cooperate (C)</b> or <b>defect (D)</b>. Your bot gets a
	fresh opponent every battle and earns points per round. Better bots win more
	battles and climb the Elo ladder.
</p>

<ul>
	<li>Write a bot in TypeScript or JavaScript, no frameworks needed!</li>
	<!-- <li>Bots run fully sandboxed: no network or files, pure functions only.</li> -->
	<li>You may have up to 3 active bots in the live tournament at once.</li>
	<li>
		Your bots' Elo starts at 1000 and updates automatically after each
		battle.
	</li>
</ul>

<p class="pb-4 pt-4">
	See the <a href="/guide">Guide</a> for bot examples (tit-for-tat, and more).
</p>

<p>
	Want to know how it works under the hood? The tournament is an
	<b>Iterated Prisoner's Dilemma</b>: in each round both you and your opponent
	choose to cooperate or defect. If you both cooperate you each get 2 points;
	if you defect while they cooperate you get 3 and they get 0; if you both
	defect you each get 1. Over at least 100 rounds, the accumulated score
	decides the winner. Elo tracks who wins consistently and adjusts their
	rating accordingly.
</p>

<p class="pt-4">
	<b
		>Track your time spent with
		<a href="https://lapse.hackclub.com/" target="_blank" rel="noreferrer"
			>Lapse</a
		>
		so we can verify it for your participation reward!</b
	>
</p>

<div id="faq">
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

			<AccordionItem title="Do I need to know game theory?">
				Not at all. The simplest bots are just a few lines — "always
				cooperate", "always defect", or "tit-for-tat" (do what your
				opponent did last round). See the Guide for examples.
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
	class="w-full pt-20"
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

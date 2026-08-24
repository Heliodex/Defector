<script lang="ts">
import Accordion from "#components/Accordion.svelte"
import AccordionItem from "#components/AccordionItem.svelte"
import Head from "#components/Head.svelte"
import { programmeName } from "#lib/assets/config.js"
import logo from "#lib/assets/powertools.svg"
</script>

<Head />

<a href="https://hackclub.com/" target="_blank" rel="noreferrer">
	<img
		id="hc"
		class="absolute top-0 left-8 border-0 w-32 z-999"
		src="https://assets.hackclub.com/flag-orpheus-top.svg"
		alt="Hack Club"
	>
</a>

<div class="text-center pb-8 flex flex-col items-center">
	<img src={logo} alt="{programmeName} logo" class="w-72">

	<h1 class="text-6xl! pb-0!">{programmeName}</h1>
	<p class="text-center pb-8">
		by
		<a
			href="https://hackclub.enterprise.slack.com/team/U07JH9LU1NC"
			target="_blank"
			rel="noreferrer"
			>@Heliodex</a
		>
	</p>
	<p class="max-w-120">
		Spend 1 hour building a mini JS framework or tool,<br>
		win $5 in cloud credits to host a demo
	</p>
</div>

<p>You could build something like:</p>
<ul>
	<li>
		A tiny JS framework (think
		<a href="https://mithril.js.org/" target="_blank" rel="noreferrer"
			>Mithril.js</a
		>)
	</li>
	<li>
		A utility library like
		<a href="https://lodash.com/" target="_blank" rel="noreferrer"
			>lodash</a
		>
		or
		<a href="https://jquery.com/" target="_blank" rel="noreferrer"
			>jQuery</a
		>
	</li>
	<li>
		Something for easily enhancing your HTML with scripting, like
		<a href="https://alpinejs.dev/" target="_blank" rel="noreferrer"
			>Alpine.js</a
		>
	</li>
	<li>A reactivity system to automatically update your HTML from data</li>
</ul>

<p class="pb-4">
	See the <a href="/guide">Guide</a>, showing how to build an example project,
	for more inspiration.
</p>

<p>
	Refurbish your frontend experience and win a grant card spendable at various
	vendors.
	<b
		>Track your time spent with
		<a href="https://lapse.hackclub.com/" target="_blank" rel="noreferrer"
			>Lapse</a
		>
		so we can verify it!</b
	>!
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
					rel="noopener noreferrer"
				>
					referring others!
				</a>
			</AccordionItem>

			<AccordionItem title="How much does it cost to join in?">
				{programmeName}
				is completely free to join and participate in. All prizes are
				provided by us.
			</AccordionItem>

			<AccordionItem title="Who runs this?">
				{programmeName}
				is sponsored by
				<a
					href="https://hackclub.com"
					target="_blank"
					rel="noopener noreferrer"
				>
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
</style>

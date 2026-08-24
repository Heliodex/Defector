<script lang="ts">
import "./layout.css"
import { repoName } from "#lib/assets/config.js"
import favicon from "#lib/assets/logo.svg"
import { getIsAdmin, getLoggedIn, login } from "./data.remote"

let { children } = $props()

const user = $derived(getLoggedIn())
const isAdmin = $derived(user.then(u => (u ? getIsAdmin() : false)))
</script>

<svelte:head>
	<link rel="icon" href={favicon}>

	<!-- Privacy-friendly analytics by Plausible -->
	<script
		async
		src="https://plausible.io/js/pa-twHcZYCXszjlsDQhYOAJl.js"
	></script>
	<script>
	;(window.plausible =
		window.plausible ||
		function () {
			;(plausible.q = plausible.q || []).push(arguments)
		}),
		(plausible.init =
			plausible.init ||
			(i => {
				plausible.o = i || {}
			}))
	plausible.init()
	</script>
</svelte:head>

<header class="max-w-280 mx-auto flex">
	<nav>
		<ul class="list-none p-0 m-0 flex gap-8 py-6">
			<li>
				<a class="btn btn-primary" href="/leaderboard">Leaderboard</a>
			</li>
			{#if await user}
				<li><a class="btn btn-primary" href="/home">Home</a></li>
				<li>
					<a class="btn btn-primary" href="/your-bots">Your bots</a>
				</li>
				<li>
					<a class="btn btn-primary" href="/submit-bot">Submit bot</a>
				</li>
				<li>
					<a class="btn btn-primary" href="/submit">Submit hours</a>
				</li>
				{#if await isAdmin}
					<li><a class="btn btn-primary" href="/admin">Admin</a></li>
				{/if}
			{:else}
				<li><a class="btn btn-primary" href="/">Landing</a></li>
				<li>
					<form {...login} class="-mt-1.5">
						<!-- why wrong paddingg ggggg -->
						<button class="btn btn-primary" type="submit">
							Login
						</button>
					</form>
				</li>
			{/if}
			<li><a class="btn btn-primary" href="/guide">Guide</a></li>
		</ul>
	</nav>
</header>

<main class="px-4 py-20 max-w-240 w-full mx-auto flex-1 min-w-0">
	{@render children()}
</main>

<footer class="bg-neutral-200 px-8 py-4 text-center">
	<p class="pb-4">
		A programme by
		<a
			href="https://hackclub.enterprise.slack.com/team/U07JH9LU1NC"
			target="_blank"
			rel="noreferrer"
			>@Heliodex</a
		>
		at
		<a href="https://hackclub.com/" target="_blank" rel="noreferrer"
			>Hack Club</a
		>!
	</p>

	<p>
		<a
			href="https://hackclub.com/privacy-and-terms"
			target="_blank"
			rel="noreferrer"
			>Privacy & Terms</a
		>
		|
		<a
			href="https://forms.hackclub.com/bounty"
			target="_blank"
			rel="noreferrer"
			>Fulfilment bounty</a
		>
		|
		<a href="https://github.com/{repoName}" target="_blank" rel="noreferrer"
			>Source code</a
		>
	</p>
</footer>

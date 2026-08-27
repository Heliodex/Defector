<script lang="ts">
import "./layout.css"
import { programmeName, repoName } from "#lib/assets/config.js"
import favicon from "#lib/assets/logo.svg"
import { page } from "$app/state"
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

{#snippet navlink(link: string, label: string)}
	<li><a class="navbtn" href="/{link}">{label}</a></li>
{/snippet}

<nav class={["sm:hidden px-4 py-3", {"pl-40": page.route.id === "/(loggedout)"}]}>
	<ul class="flex flex-wrap gap-5">
		{#if await user}
			{@render navlink("home", "Home")}
		{/if}
		{@render navlink("leaderboard", "Leaderboard")}
		{#if await user}
			{@render navlink("your-bots", "Your bots")}
			{@render navlink("submit-bot", "Submit bot")}
			{@render navlink("submit", "Submit hours")}
			{#if await isAdmin}
				{@render navlink("admin", "Admin")}
			{/if}
		{:else}
			{@render navlink("", "Landing")}
			<li>
				<form {...login}>
					<button class="navbtn" type="submit">Log in</button>
				</form>
			</li>
		{/if}
		{@render navlink("guide", "Guide")}
	</ul>
</nav>

<aside
	class="sidebar hidden sm:block fixed inset-y-0 left-0 w-40 overflow-y-auto border-r-2 border-neutral-200 bg-white z-1"
>
	<h1 class="text-2xl! p-4">{programmeName}</h1>
	<nav class="p-4 pt-0">
		<ul class="flex flex-col gap-4">
			{#if await user}
				{@render navlink("home", "Home")}
			{/if}
			{@render navlink("leaderboard", "Leaderboard")}
			{#if await user}
				{@render navlink("your-bots", "Your bots")}
				{@render navlink("submit-bot", "Submit bot")}
				{@render navlink("submit", "Submit hours")}
				{#if await isAdmin}
					{@render navlink("admin", "Admin")}
				{/if}
			{:else}
				{@render navlink("", "Landing")}
				<li>
					<form {...login} class="w-full">
						<button class="navbtn w-full" type="submit">
							Login
						</button>
					</form>
				</li>
			{/if}
			{@render navlink("guide", "Guide")}
		</ul>
	</nav>
</aside>

<div class="flex flex-col flex-1 min-w-0 sm:pl-40">
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
			<a
				href="https://github.com/{repoName}"
				target="_blank"
				rel="noreferrer"
				>Source code</a
			>
		</p>
	</footer>
</div>

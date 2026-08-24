<script lang="ts">
import "./layout.css"
import { repoName } from "#lib/assets/config.js"
import favicon from "#lib/assets/powertools.svg"
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
			{#if await user}
				<li><a class="btn" href="/home">Home</a></li>
			{:else}
				<li><a class="btn" href="/">Landing</a></li>
			{/if}
			<li><a class="btn" href="/guide">Guide</a></li>
			{#if await user}
				<li><a class="btn" href="/submit">Submit</a></li>
				{#if await isAdmin}
					<li><a class="btn" href="/admin">Admin</a></li>
				{/if}
			{:else}
				<li>
					<form {...login} class="-mt-1.5">
						<!-- why wrong paddingg ggggg -->
						<button class="btn" type="submit">Login</button>
					</form>
				</li>
			{/if}
		</ul>
	</nav>
</header>

<main class="px-4 py-20 max-w-240 w-full mx-auto flex-1 min-w-0">
	{@render children()}
</main>

<footer class="bg-stone-950 px-8 py-4 text-center">
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
		<a href="https://github.com/{repoName}" target="_blank" rel="noreferrer"
			>Source code</a
		>
	</p>
</footer>

<style>
@import "tailwindcss";

li {
	@apply inline-block;

	a,
	button {
		@apply text-black bg-[#f7df1e] hover:bg-yellow-600 active:bg-yellow-400 shadow-amber-500;

		box-shadow: 0.1rem 0.1rem 0 var(--tw-shadow-color);
	}
}
</style>

<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getLapseData, lapseLogin, logout } from "../api.remote"

const lapseData = $derived(await getLapseData())
</script>

<Head title="Home" />

<h1>You're ready to play</h1>

<p class="pb-6">
	Write a bot, activate it, and it'll start battling every few seconds on the
	<a href="/leaderboard">live leaderboard</a>.
</p>

<div class="grid gap-4 pt-2 sm:grid-cols-2">
	<a
		href="/submit-bot"
		class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400 font-bold text-center"
	>
		Submit a bot
	</a>
	<a
		href="/your-bots"
		class="btn bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 font-bold text-center"
	>
		My bots
	</a>
	<a
		href="/submit"
		class="btn bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 font-bold text-center"
	>
		Submit work & hours
	</a>
</div>

{#if lapseData}
	<div class="pt-8">
		<h2 class="text-2xl">Your Lapse account</h2>
		<div class="flex items-center gap-3 pt-2">
			{#if lapseData.profilePictureUrl}
				<img
					src={lapseData.profilePictureUrl}
					alt="Lapse profile"
					class="size-12 rounded-full"
				>
			{/if}
			<div>
				<p class="font-semibold">{lapseData.displayName}</p>
				<p class="text-sm text-neutral-400">@{lapseData.handle}</p>
			</div>
		</div>
	</div>
{:else}
	<div class="pt-8">
		<h2 class="text-2xl">Track your hours with Lapse</h2>
		<p class="pb-2 text-sm text-neutral-400">
			Connect your Lapse account so we can verify the time you spend on
			this event.
		</p>
		<form {...lapseLogin}>
			<button
				class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400"
			>
				Link Lapse account
			</button>
		</form>
	</div>
{/if}

<form {...logout} class="pt-8">
	<button class="btn bg-red-500 hover:bg-red-600 active:bg-red-400 font-bold">
		Log out
	</button>
</form>

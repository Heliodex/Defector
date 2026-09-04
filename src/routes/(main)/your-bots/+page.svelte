<script lang="ts">
import BotCard from "#lib/components/BotCard.svelte"
import Head from "#lib/components/Head.svelte"
import { getMyBots } from "./myBots.remote"

const bots = $derived(await getMyBots())

const activeCount = $derived(
	bots?.filter(b => b.active === "active").length ?? 0
)
</script>

<Head title="Your bots" noindex />

<h1 class="text-2xl">Your bots</h1>

<p class="pt-2 pb-2 text-sm text-neutral-600">
	You may have at most 3 active bots at once ({activeCount}/3 active).
</p>

{#if activeCount >= 3}
	<p class="pb-4 text-sm font-bold text-blue-600">
		You've hit the 3-active-bot limit. Deactivate one before activating
		another.
	</p>
{/if}

{#if !bots || bots.length === 0}
	<div class="pt-4">
		<p class="pb-4">You haven't submitted any bots yet.</p>
		<a href="/submit-bot" class="btn btn-primary">
			Submit your first bot
		</a>
		<p class="pt-4">
			<a href="/your-bots/archived" class="text-blue-400 hover:underline"
				>View archived bots</a
			>
		</p>
	</div>
{:else}
	<ul class="noul grid gap-4 pt-4 sm:grid-cols-2">
		{#each bots as bot (bot.id)}
			<BotCard {bot} />
		{/each}
	</ul>

	<p class="pt-6 flex gap-4">
		<a href="/submit-bot" class="text-blue-400 hover:underline"
			>Submit a new bot</a
		>
		<a href="/your-bots/archived" class="text-blue-400 hover:underline"
			>View archived bots</a
		>
	</p>
{/if}

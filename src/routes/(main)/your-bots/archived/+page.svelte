<script lang="ts">
import BotCard from "#lib/components/BotCard.svelte"
import Head from "#lib/components/Head.svelte"
import { getArchivedBots } from "../myBots.remote"

const bots = $derived(await getArchivedBots())
</script>

<Head title="Archived bots" noindex />

<h1 class="text-2xl">Archived bots</h1>

<p class="pt-2 pb-2 text-sm text-neutral-600">
	Archived bots sit out of the tournament and don't count towards your
	3-active-bot limit. Restore one to bring it back.
</p>

<p class="pb-2">
	<a href="/your-bots" class="text-sm text-blue-400 hover:underline">
		Back to Your bots
	</a>
</p>

{#if !bots || bots.length === 0}
	<div class="pt-4">
		<p class="pb-4">You don't have any archived bots.</p>
	</div>
{:else}
	<ul class="noul grid gap-4 pt-4 sm:grid-cols-2">
		{#each bots as bot (bot.id)}
			<BotCard {bot} />
		{/each}
	</ul>
{/if}

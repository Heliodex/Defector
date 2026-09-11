<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { page } from "$app/state"
import { getPublicSubmission } from "./submission.remote"

const sub = $derived(await getPublicSubmission(page.params.id ?? ""))

const imageSrc = $derived(
	sub.image?.hash ? `/submission/image/${sub.image.hash}` : null
)
</script>

<Head
	title={truncate(sub.name)}
	description={truncate(sub.description, 155)}
	type="article"
/>

<h1 class="pt-4 text-2xl font-bold">{truncate(sub.name)}</h1>

<p class="pt-2 text-sm text-gray-500">Submitted {sub.created}</p>

<p class="max-w-xl pt-6 whitespace-pre-wrap wrap-break-word">
	{sub.description}
</p>

{#if imageSrc}
	<img
		src={imageSrc}
		alt={sub.name}
		loading="lazy"
		class="mt-6 w-full max-w-xl rounded-lg object-cover"
	>
{/if}

<div class="pt-6 grid max-w-xl grid-cols-2 gap-4 text-sm">
	<div>
		<p class="text-gray-500">Code</p>
		<p>
			<a href={sub.codeUrl} target="_blank" rel="noreferrer">View code</a>
		</p>
	</div>
	<div>
		<p class="text-gray-500">AI used</p>
		<p class="font-semibold">{sub.ai ? "Yes" : "No"}</p>
	</div>
</div>

<div class="pt-6 max-w-xl">
	<h2 class="font-semibold">Bots</h2>
	{#if sub.bots.length > 0}
		<ul class="noul flex flex-col gap-1 pt-2">
			{#each sub.bots as bot (bot.id)}
				<li>
					<a
						href="/bot/{bot.id}"
						class="font-semibold hover:underline"
					>
						{truncate(bot.name)}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="pt-1 text-sm text-gray-500">No bots listed.</p>
	{/if}
</div>

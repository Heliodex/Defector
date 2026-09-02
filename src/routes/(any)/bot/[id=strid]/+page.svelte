<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { page } from "$app/state"
import { getBot } from "./bot.remote"

const bot = $derived(await getBot(page.params.id ?? ""))
</script>

<Head title={`Bot: ${truncate(bot.name)}`} />

<a href="/leaderboard" class="text-sm hover:underline">Back to leaderboard</a>

<h1 class="text-2xl font-bold pt-4">{truncate(bot.name)}</h1>

<p class="pt-2 text-sm text-gray-500">
	Created
	{new Date(bot.created).toLocaleDateString()}
	{#if bot.ownerName}
		by {bot.ownerName}
	{/if}
</p>

<p class="pt-2">
	{#if bot.active}
		<span
			class="inline-block px-2 py-0.5 rounded bg-green-500 text-white text-sm"
			>Active</span
		>
	{:else}
		<span
			class="inline-block px-2 py-0.5 rounded bg-gray-400 text-white text-sm"
			>Inactive</span
		>
	{/if}
</p>

{#if bot.description}
	<p class="pt-4">{bot.description}</p>
{/if}

{#if bot.codeUrl}
	<p class="pt-2">
		<a
			href={bot.codeUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="text-sm underline"
			>View code</a
		>
	</p>
{/if}

<div class="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
	<div class="shadowcard">
		<p class="text-xs text-gray-500">Avg score</p>
		<p class="text-xl font-semibold">{bot.meanScore.toFixed(2)}</p>
	</div>
	<div class="shadowcard">
		<p class="text-xs text-gray-500">Wins</p>
		<p class="text-xl font-semibold">{bot.stats.wins}</p>
	</div>
	<div class="shadowcard">
		<p class="text-xs text-gray-500">Losses</p>
		<p class="text-xl font-semibold">{bot.stats.losses}</p>
	</div>
	<div class="shadowcard">
		<p class="text-xs text-gray-500">Win rate</p>
		<p class="text-xl font-semibold">
			{bot.stats.battles > 0 ? ((bot.stats.wins / bot.stats.battles) * 100).toFixed(1) : "0.0"}%
		</p>
	</div>
</div>

<p class="pt-1 text-xs text-gray-500 max-w-xl">
	Total battles: {bot.stats.battles}
</p>

<div class="pt-6 max-w-xl">
	<h2 class="font-semibold">Score history</h2>
	{#if bot.scoreHistory.length > 1}
		{let scores = bot.scoreHistory}
		{let min = Math.min(...scores)}
		{let max = Math.max(...scores)}
		{let len = scores.length}
		{let span = max - min || 1}
		{let points = scores
			.map((score, i) => {
				const x = (i / (len - 1)) * 100
				const y = 29 - ((score - min) / span) * 28 // 1 unit padding top and bottom
				return `${x},${y}`
			})
			.join(" ")}
		<div class="shadowcard">
			<svg
				aria-label="Score history"
				viewBox="0 0 100 30"
				preserveAspectRatio="none"
				class="w-full h-16"
			>
				<polyline
					{points}
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				/>
			</svg>
			<p class="pt-1 text-xs text-gray-500 text-right">Avg: {bot.meanScore.toFixed(2)}</p>
		</div>
	{:else}
		<p class="pt-1 text-gray-500">Not enough battles for a chart yet.</p>
	{/if}
</div>

<div class="pt-6 max-w-xl">
	<h2 class="font-semibold pb-2">Source</h2>
	<pre
		class="shadowcard overflow-auto text-xs leading-6"
	><code>{bot.source}</code></pre>
</div>

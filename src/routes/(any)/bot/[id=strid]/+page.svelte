<script lang="ts">
import BattleRow from "#lib/components/BattleRow.svelte"
import Head from "#lib/components/Head.svelte"
import ScoreSparkline from "#lib/components/ScoreSparkline.svelte"
import { truncate } from "#lib/truncate.js"
import { page } from "$app/state"
import { getBot, getBotBattles } from "./bot.remote"

const bot = $derived(await getBot(page.params.id ?? ""))
const battles = $derived(await getBotBattles(page.params.id ?? ""))
</script>

<Head
	title={`Bot: ${truncate(bot.name)}`}
	description={bot.description ||
		`${truncate(bot.name)} is a Defector bot${bot.ownerName ? ` by ${bot.ownerName}` : ""}, rated Elo ${bot.elo} in the live Iterated Prisoner's Dilemma tournament.`}
	type="article"
/>

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
		<p class="text-xl font-semibold">{bot.meanScore.toFixed(3)}</p>
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
	{#if bot.curScores && bot.curScores.length > 1}
		<div class="shadowcard">
			<ScoreSparkline scores={bot.curScores} meanScore={bot.meanScore} />
			<p class="pt-1 text-xs text-gray-500 text-right">
				Avg: {bot.meanScore.toFixed(3)}
			</p>
		</div>
	{:else}
		<p class="pt-1 text-gray-500">Not enough battles for a chart yet.</p>
	{/if}
</div>

<div class="pt-6 max-w-xl">
	<h2 class="font-semibold">Recent battles</h2>
	{#if battles.length === 0}
		<p class="pt-1 text-gray-500">No battles yet.</p>
	{:else}
		<ul class="noul flex flex-col gap-2 pt-2">
			{#each battles as battle (battle.id)}
				<li>
					<BattleRow {battle} />
				</li>
			{/each}
		</ul>
	{/if}
</div>

<div class="pt-6 max-w-xl">
	<h2 class="font-semibold pb-2">Source</h2>
	<pre
		class="shadowcard overflow-auto text-xs leading-6"
	><code>{bot.source}</code></pre>
</div>

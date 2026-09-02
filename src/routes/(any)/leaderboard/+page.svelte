<script lang="ts">
import { onMount } from "svelte"
import { flip } from "svelte/animate"
import { fly } from "svelte/transition"
import Head from "#lib/components/Head.svelte"
import TimeAgo from "#lib/components/TimeAgo.svelte"
import { truncate } from "#lib/truncate.js"
import { type LeaderboardData, leaderboardData } from "./leaderboard.remote"

const dataResult = leaderboardData()
const data = $state<LeaderboardData>({
	battles: [],
	allBattles: 0,
	bots: [],
	activeBots: 0,
})

onMount(async () => {
	for await (const msg of dataResult) {
		// keep-alive from the idle server generator, not data
		if ("heartbeat" in msg) continue
		if (msg.og) {
			Object.assign(data, msg)
			continue
		}

		data.battles = [...msg.battles, ...data.battles].slice(0, 50)
		data.allBattles = msg.allBattles
		data.bots = msg.bots
		data.activeBots = msg.activeBots
	}
})

const connected = $derived(dataResult.connected)
</script>

<Head
	title="Leaderboard"
	description="Watch the live Elo leaderboard: every Defector bot ranked by wins as they battle in an Iterated Prisoner's Dilemma tournament."
/>

<div class="flex items-center justify-between">
	<h1 class="text-2xl">Live leaderboard</h1>

	<span
		class={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white", connected ? 'bg-green-600' : 'bg-orange-600']}
	>
		<span
			class={["size-2 rounded-full", connected ? 'bg-green-200' : 'bg-orange-200']}
		></span>
		{connected ? "Live" : "Connecting..."}
	</span>
</div>

{#if !data}
	<p class="pt-4 text-neutral-600">Loading leaderboard…</p>
{:else}
	<p class="py-2 text-sm text-neutral-600">
		{data.activeBots}
		active bot{data.activeBots === 1 ? "" : "s"}
		·
		{data.allBattles}
		battle{data.allBattles === 1 ? "" : "s"}
		fought
	</p>

	{#if data.bots.length === 0}
		<p class="pt-4">Loading leaderboard bots...</p>
	{:else}
		<div class="overflow-x-auto px-4 sm:px-6">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="text-left text-neutral-600">
						<th class="border-b border-neutral-200 p-3">#</th>
						<th class="border-b border-neutral-200 p-3">Bot</th>
						<!-- <th class="border-b border-neutral-200 p-3">Owner</th> -->
						<th class="border-b border-neutral-200 p-3">Avg score</th>
						<th class="border-b border-neutral-200 p-3">W-L</th>
						<th class="border-b border-neutral-200 p-3">Battles</th>
					</tr>
				</thead>
				<tbody>
					{#each data.bots as bot, i (bot.id)}
						<tr class="align-top">
							<td
								class="border-b border-neutral-300 p-3 font-semibold"
							>
								{i + 1}
							</td>
							<td class="border-b border-neutral-300 p-3">
								<a
									href="/bot/{bot.id}"
									class="font-semibold text-blue-600 hover:text-blue-700"
									>{truncate(bot.name)}</a
								>
							</td>
							<!-- <td
								class="border-b border-neutral-300 p-3 text-neutral-600"
							>
								{bot.ownerName ?? "—"}
							</td> -->
							<td
								class="border-b border-neutral-300 p-3 font-bold"
							>
								{bot.meanScore.toFixed(3)}
							</td>
							<td class="border-b border-neutral-300 p-3">
								{bot.stats.wins}-{bot.stats.losses}
							</td>
							<td class="border-b border-neutral-300 p-3">
								{bot.stats.battles}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2 class="pt-10 text-2xl">Recent battles</h2>

	{#if data.battles.length === 0}
		<p class="pt-2 text-neutral-600">Loading battles...</p>
	{:else}
		<ul class="noul flex flex-col gap-2 pt-4">
			{#each data.battles as battle (battle.id)}
				<li
					in:fly={{ x: -200, duration: 400 }}
					out:fly={{ y: 100, duration: 400 }}
					animate:flip={{ duration: 300 }}
				>
					<a
						href="/battle/{battle.id}"
						class="btn flex items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2 hover:border-blue-600"
					>
						<span>
							<span class="font-semibold"
								>{truncate(battle.botNames[0])}</span
							>
							<span class="text-neutral-600"> vs </span>
							<span class="font-semibold"
								>{truncate(battle.botNames[1])}</span
							>
						</span>
						<span class="text-xs text-neutral-600">
							<TimeAgo date={battle.created} />
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

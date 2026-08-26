<script lang="ts">
import { onMount } from "svelte"
import Head from "#lib/components/Head.svelte"
import TimeAgo from "#lib/components/TimeAgo.svelte"
import {
	type LeaderboardBattles,
	type LeaderboardBots,
	leaderboardBattles,
	leaderboardBots,
} from "./leaderboard.remote"

const battleDataResult = leaderboardBattles()
const botDataResult = leaderboardBots()

let battles = $state<LeaderboardBattles>({ battles: [], allBattles: 0 })
let bots = $state<LeaderboardBots>({ bots: [], activeBots: 0 })

onMount(async () => {
	for await (const msg of battleDataResult) {
		console.log("NEW BATTLE MESSAGE", msg)
		if (msg.og) {
			battles = msg
			continue
		}

		battles.battles.push(...msg.battles)
		battles.allBattles = msg.allBattles
	}
})

// const bots = $derived(await botDataResult)
onMount(async () => {
	for await (const msg of botDataResult) {
		console.log("NEW BOT MESSAGE", msg)
		if (msg.og) {
			bots = msg
			continue
		}

		for (const bot of msg.bots) {
			// replace bots by index
			const index = bots.bots.findIndex(b => b.id === bot.id)
			if (index !== -1) bots.bots[index] = bot
			else {
				console.log("new bot", bot)
				bots.bots.push(bot)
			}
		}
		bots.activeBots = msg.activeBots
	}
})

const connected = $derived(
	battleDataResult.connected && botDataResult.connected
)
</script>

<Head title="Leaderboard" />

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

{#if !bots || !battles}
	<p class="pt-4 text-neutral-600">Loading leaderboard…</p>
{:else}
	<p class="pt-2 text-sm text-neutral-600">
		{bots.activeBots}
		active bot{bots.activeBots === 1 ? "" : "s"}
		·
		{battles.allBattles}
		battle{battles.allBattles === 1 ? "" : "s"}
		fought
	</p>

	{#if bots.bots.length === 0}
		<p class="pt-4">
			No active bots yet. Submit one today and it'll start battling in
			seconds.
		</p>
	{:else}
		<div class="overflow-x-auto px-4 sm:px-6">
			<table class="w-full min-w-200 border-collapse text-sm">
				<thead>
					<tr class="text-left text-neutral-600">
						<th class="border-b border-neutral-200 p-3">#</th>
						<th class="border-b border-neutral-200 p-3">Bot</th>
						<th class="border-b border-neutral-200 p-3">Owner</th>
						<th class="border-b border-neutral-200 p-3">Elo</th>
						<th class="border-b border-neutral-200 p-3">W-L</th>
						<th class="border-b border-neutral-200 p-3">Battles</th>
					</tr>
				</thead>
				<tbody>
					{#each bots.bots as bot, i (bot.id)}
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
									>{bot.name}</a
								>
							</td>
							<td
								class="border-b border-neutral-300 p-3 text-neutral-600"
							>
								{bot.ownerName ?? "—"}
							</td>
							<td
								class="border-b border-neutral-300 p-3 font-bold"
							>
								{Math.round(bot.elo)}
							</td>
							<td class="border-b border-neutral-300 p-3">
								{bot.wins}-{bot.losses}
							</td>
							<td class="border-b border-neutral-300 p-3">
								{bot.totalBattles}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2 class="pt-10 text-2xl">Recent battles</h2>

	{#if battles.battles.length === 0}
		<p class="pt-2 text-neutral-600">No battles yet.</p>
	{:else}
		<ul class="noul flex flex-col gap-2 pt-4">
			{#each battles.battles as battle (battle.id)}
				<li>
					<a
						href="/battle/{battle.id}"
						class="btn flex items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2 hover:border-blue-600"
					>
						<span>
							<span class="font-semibold"
								>{battle.botNames[0]}</span
							>
							<span class="text-neutral-600"> vs </span>
							<span class="font-semibold"
								>{battle.botNames[1]}</span
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

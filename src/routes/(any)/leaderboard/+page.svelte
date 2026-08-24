<script lang="ts">
import { onMount } from "svelte"
import Head from "#lib/components/Head.svelte"
import { type Leaderboard, leaderboard } from "./leaderboard.remote"

let data = $state<Leaderboard | null>(null)

// Subscribe to the live query stream; each snapshot replaces `data`.
onMount(() => {
	const iterator = leaderboard()[Symbol.asyncIterator]()
	let active = true

	void (async () => {
		while (active) {
			const { value, done } = await iterator.next()
			if (done) break
			data = value
		}
	})()

	return () => {
		active = false
		void iterator.return?.(undefined)
	}
})
</script>

<Head title="Leaderboard" />

<div class="flex items-center justify-between">
	<h1 class="text-2xl">Live leaderboard</h1>

	{#if data}
		<span
			class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold {data.connected ? 'bg-green-600' : 'bg-red-600'}"
		>
			<span
				class="size-2 rounded-full {data.connected ? 'bg-green-200' : 'bg-red-200'}"
			></span>
			{data.connected ? "Live" : "Connecting…"}
		</span>
	{/if}
</div>

{#if !data}
	<p class="pt-4 text-neutral-400">Loading leaderboard…</p>
{:else}
	<p class="pt-2 text-sm text-neutral-400">
		{data.activeBots}
		active bot{data.activeBots === 1 ? "" : "s"}
		·
		{data.totalBattles}
		battle{data.totalBattles === 1 ? "" : "s"}
		fought
	</p>

	{#if data.bots.length === 0}
		<p class="pt-4">
			No active bots yet. Submit one today and it'll start battling in
			seconds.
		</p>
	{:else}
		<div
			class="relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip"
		>
			<div class="overflow-x-auto px-4 sm:px-6">
				<table class="w-full min-w-200 border-collapse text-sm">
					<thead>
						<tr class="text-left text-neutral-400">
							<th class="border-b border-neutral-600 p-3">#</th>
							<th class="border-b border-neutral-600 p-3">Bot</th>
							<th class="border-b border-neutral-600 p-3">
								Owner
							</th>
							<th class="border-b border-neutral-600 p-3">Elo</th>
							<th class="border-b border-neutral-600 p-3">W-L</th>
							<th class="border-b border-neutral-600 p-3">
								Battles
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.bots as bot, i (bot.id)}
							<tr class="align-top">
								<td
									class="border-b border-neutral-700 p-3 font-semibold"
								>
									{i + 1}
								</td>
								<td class="border-b border-neutral-700 p-3">
									<a
										href="/bot/{bot.id}"
										class="font-semibold text-yellow-300 hover:text-yellow-400"
										>{bot.name}</a
									>
								</td>
								<td
									class="border-b border-neutral-700 p-3 text-neutral-300"
								>
									{bot.ownerName ?? "—"}
								</td>
								<td
									class="border-b border-neutral-700 p-3 font-bold"
								>
									{Math.round(bot.elo)}
								</td>
								<td class="border-b border-neutral-700 p-3">
									{bot.wins}-{bot.losses}
								</td>
								<td class="border-b border-neutral-700 p-3">
									{bot.totalBattles}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<h2 class="pt-10 text-2xl">Recent battles</h2>

	{#if data.battles.length === 0}
		<p class="pt-2 text-neutral-400">No battles yet.</p>
	{:else}
		<ul class="grid gap-2 pt-4">
			{#each data.battles as battle (battle.id)}
				<li>
					<a
						href="/battle/{battle.id}"
						class="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 hover:border-yellow-600"
					>
						<span>
							<span class="font-semibold">{battle.bot0}</span>
							<span class="text-neutral-400"> vs </span>
							<span class="font-semibold">{battle.bot1}</span>
						</span>
						<span class="text-xs text-neutral-400"
							>{battle.created}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

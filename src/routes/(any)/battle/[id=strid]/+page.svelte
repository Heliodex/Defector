<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getBattle } from "./battle.remote"

const battle = $derived(await getBattle())

function name(i: 0 | 1): string {
	if (!battle) return ""
	return battle.botNames[i] ?? battle.botIds[i] ?? `Bot ${i + 1}`
}

function botHref(i: 0 | 1): string | null {
	if (!battle) return null
	const id = battle.botIds[i]
	return id ? `/bot/${id}` : null
}
</script>

{#if battle}
	<Head title="Battle" />

	<a href="/leaderboard" class="text-sm hover:underline"
		>Back to leaderboard</a
	>

	<h1 class="text-2xl font-bold pt-4">Battle {battle.id}</h1>

	<p class="pt-2 text-sm text-gray-500">
		{new Date(battle.created).toLocaleString()}
	</p>

	<div class="pt-4 rounded border p-4 max-w-xl">
		<div class="flex items-center justify-between gap-4">
			{#if battle.winnerIndex === 0}
				<span class="font-bold"
					>{#if botHref(0)}
						<a href={botHref(0)} class="underline">{name(0)}</a>
					{:else}
						{name(0)}
					{/if}</span
				>
			{:else}
				<span
					>{#if botHref(0)}
						<a href={botHref(0)} class="underline">{name(0)}</a>
					{:else}
						{name(0)}
					{/if}</span
				>
			{/if}
			<span class="text-2xl font-semibold"
				>{battle.scores[0]}
				: {battle.scores[1]}</span
			>
			{#if battle.winnerIndex === 1}
				<span class="font-bold"
					>{#if botHref(1)}
						<a href={botHref(1)} class="underline">{name(1)}</a>
					{:else}
						{name(1)}
					{/if}</span
				>
			{:else}
				<span
					>{#if botHref(1)}
						<a href={botHref(1)} class="underline">{name(1)}</a>
					{:else}
						{name(1)}
					{/if}</span
				>
			{/if}
		</div>

		<p class="pt-2 text-center text-sm">
			{#if battle.winnerIndex !== null}
				<span class="text-green-600"
					>{name(battle.winnerIndex)}
					won</span
				>
			{:else}
				<span class="text-gray-500">Tie</span>
			{/if}
		</p>
	</div>

	{#if battle.errors.some(Boolean)}
		<div class="pt-4 max-w-xl">
			<h2 class="font-semibold">Errors</h2>
			<p class="pt-1 text-sm text-gray-500">
				This battle was forfeited because a bot crashed.
			</p>
			{#each battle.errors as err, i (i)}
				{#if err}
					<div class="pt-2 rounded border border-red-300 p-3 text-sm">
						<p class="font-medium">{name(i as 0 | 1)} crashed:</p>
						<p class="text-red-600 whitespace-pre-wrap">{err}</p>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="pt-6 max-w-xl">
		<h2 class="font-semibold">Replay (100 rounds)</h2>
		<details class="pt-2">
			<summary class="cursor-pointer text-sm">Show all rounds</summary>
			<div class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
				{#each battle.rounds as round, i (i)}
					<div class="rounded border px-2 py-1 text-xs">
						Round {i + 1}:
						{name(0)} {round[0]} vs {name(1)} {round[1]}
					</div>
				{/each}
			</div>
		</details>
	</div>
{/if}

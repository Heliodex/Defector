<script lang="ts">
import Accordion from "#lib/components/Accordion.svelte"
import AccordionItem from "#lib/components/AccordionItem.svelte"
import Head from "#lib/components/Head.svelte"
import { page } from "$app/state"
import { getBattle } from "./battle.remote"

const battle = $derived(await getBattle(page.params.id ?? ""))

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

<Head title="Battle" />

<a href="/leaderboard" class="text-sm hover:underline">Back to leaderboard</a>

<h1 class="text-2xl font-bold pt-4">Battle {battle.id}</h1>

<p class="pt-2 text-sm text-gray-500">
	{new Date(battle.created).toLocaleString()}
</p>

<div class="shadowcard max-w-xl">
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

		<div class="flex flex-col gap-4 pt-2">
			{#each battle.errors as err, i (i)}
				{#if err}
					<div class="shadowcard  border-red-300 text-sm">
						<p class="font-medium">
							{name(i as 0 | 1)}
							crashed:
						</p>
						<p class="text-red-600 whitespace-pre-wrap">
							{err}
						</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

{#if battle.rounds.length > 0}
	<div class="pt-6 max-w-xl">
		<h2 class="font-semibold">Replay ({battle.rounds.length} rounds)</h2>

		<Accordion class="flex flex-col gap-4">
			<AccordionItem title="Show all rounds">
				<table class="w-full">
					<thead>
						<tr>
							<th>Round</th>
							<th>{name(0)}</th>
							<th>{name(1)}</th>
						</tr>
					</thead>
					<tbody>
						{#each battle.rounds as round, i (i)}
							<tr>
								<td>Round {i + 1}</td>
								<td class="text-center">{round[0]}</td>
								<td class="text-center">{round[1]}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</AccordionItem>
		</Accordion>
	</div>
{:else}
	<p class="pt-6 text-sm text-gray-500">
		This battle did not have any rounds.
	</p>
{/if}

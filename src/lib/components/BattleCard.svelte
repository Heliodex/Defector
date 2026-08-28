<script lang="ts">
import type { Battle } from "../../routes/(any)/battle/[id=strid]/battle.remote"

const {
	battle,
	name,
}: {
	battle: Battle
	name: (i: 0 | 1) => string
} = $props()

function botHref(i: 0 | 1): string | null {
	if (!battle) return null
	const id = battle.botIds[i]
	return id ? `/bot/${id}` : null
}

// 2 decimal places
const round = (num: number): number => Math.round(num * 100) / 100
</script>

<div class="shadowcard max-w-xl">
	<div class="flex items-center justify-between gap-4">
		<span class={{"font-bold": battle.winnerIndex === 0}}>
			{#if botHref(0)}
				<a href={botHref(0)} class="underline">{name(0)}</a>
			{:else}
				{name(0)}
			{/if}
		</span>
		<span class="text-2xl font-semibold"
			>{round(battle.scores[0])}
			: {round(battle.scores[1])}</span
		>
		<span class={{"font-bold": battle.winnerIndex === 1}}>
			{#if botHref(1)}
				<a href={botHref(1)} class="underline">{name(1)}</a>
			{:else}
				{name(1)}
			{/if}
		</span>
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

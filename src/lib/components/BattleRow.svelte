<script lang="ts">
import { truncate } from "#lib/truncate.js"
import TimeAgo from "./TimeAgo.svelte"

type Battle = {
	id: string
	created: Date
	botNames: [string, string] | string[]
	scores: [number, number] | number[]
}

const { battle }: { battle: Battle } = $props()

const winnerIndex: 0 | 1 | null = $derived(
	battle.scores[0] > battle.scores[1]
		? 0
		: battle.scores[1] > battle.scores[0]
			? 1
			: null
)

// 2 decimal places
const round = (num: number): number => Math.round(num * 100) / 100
</script>

<a
	href="/battle/{battle.id}"
	class="btn flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2 hover:border-blue-600"
>
	<span>
		<span
			class={winnerIndex === 0
				? "font-bold text-green-600"
				: "font-semibold"}
			title={winnerIndex === 0 ? "Winner" : undefined}
			>{truncate(battle.botNames[0])}</span
		>
		<span class="text-neutral-600 px-2">
			{round(battle.scores[0])}
			<span class="px-2"> vs </span>
			{round(battle.scores[1])}
		</span>
		<span
			class={winnerIndex === 1
				? "font-bold text-green-600"
				: "font-semibold"}
			title={winnerIndex === 1 ? "Winner" : undefined}
			>{truncate(battle.botNames[1])}</span
		>
		{#if winnerIndex === null}
			<span
				class="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-bold text-neutral-600"
				>Tie</span
			>
		{/if}
	</span>
	<span class="text-xs text-neutral-600">
		<TimeAgo date={battle.created} />
	</span>
</a>

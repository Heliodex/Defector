<script lang="ts">
import { truncate } from "#lib/truncate.js"
import type { Battle } from "../../routes/(any)/battle/[id=strid]/battle.remote"

type CardBattle = Pick<
	Battle,
	"botIds" | "botNames" | "scores" | "winnerIndex"
> & { eloDelta?: number[] }

const { battle }: { battle: CardBattle } = $props()

const name = (i: 0 | 1): string =>
	battle
		? truncate(battle.botNames[i] ?? battle.botIds[i] ?? `Bot ${i + 1}`)
		: ""

function botHref(i: 0 | 1): string | null {
	if (!battle) return null
	const id = battle.botIds[i]
	return id ? `/bot/${id}` : null
}

// 2 decimal places
const round = (num: number): number => Math.round(num * 100) / 100

const deltaText = (i: 0 | 1): string => {
	const d = battle.eloDelta?.[i]
	if (d === undefined) return ""
	const r = round(d)
	if (r === 0) return "0"
	return `${r > 0 ? "+" : ""}${r}`
}

const deltaClass = (i: 0 | 1): string => {
	const d = battle.eloDelta?.[i]
	if (d === undefined) return ""
	if (d > 0) return "text-green-600"
	if (d < 0) return "text-red-600"
	return "text-gray-500"
}
</script>

<div class="shadowcard max-w-xl">
	<div class="flex items-center justify-between gap-4">
		<span class="flex flex-col items-center gap-0.5">
			<span class={{"font-bold": battle.winnerIndex === 0}}>
				{#if botHref(0)}
					<a href={botHref(0)} class="underline">{name(0)}</a>
				{:else}
					{name(0)}
				{/if}
			</span>
			{#if battle.eloDelta?.[0] !== undefined}
				<span class={["text-sm", deltaClass(0)]}>{deltaText(0)}</span>
			{/if}
		</span>
		<span class="text-2xl font-semibold"
			>{round(battle.scores[0])}
			: {round(battle.scores[1])}</span
		>
		<span class="flex flex-col items-center gap-0.5">
			<span class={{"font-bold": battle.winnerIndex === 1}}>
				{#if botHref(1)}
					<a href={botHref(1)} class="underline">{name(1)}</a>
				{:else}
					{name(1)}
				{/if}
			</span>
			{#if battle.eloDelta?.[1] !== undefined}
				<span class={["text-sm", deltaClass(1)]}>{deltaText(1)}</span>
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

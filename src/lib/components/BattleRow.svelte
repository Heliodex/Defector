<script lang="ts">
import { truncate } from "#lib/truncate.js"
import TimeAgo from "./TimeAgo.svelte"

type Battle = {
	id: string
	created: Date
	botNames: [string, string] | string[]
}

const { battle }: { battle: Battle } = $props()
</script>

<a
	href="/battle/{battle.id}"
	class="btn flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2 hover:border-blue-600"
>
	<span>
		<span class="font-semibold">{truncate(battle.botNames[0])}</span>
		<span class="text-neutral-600"> vs </span>
		<span class="font-semibold">{truncate(battle.botNames[1])}</span>
	</span>
	<span class="text-xs text-neutral-600">
		<TimeAgo date={battle.created} />
	</span>
</a>

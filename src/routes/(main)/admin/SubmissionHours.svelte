<script lang="ts">
import { getSubmissionHours } from "./admin.remote"

const {
	submissionId,
	multiplier,
}: {
	submissionId: string
	multiplier: number
} = $props()

let result = $derived(await getSubmissionHours(submissionId))
let hours = $derived(result.totalSeconds / 3600)
let rate = $derived(4 * multiplier)
let total = $derived(hours * rate)
</script>

{#if result.error}
	<p class="pt-2 text-sm text-red-500">
		Could not load hours: {result.error}
	</p>
{:else}
	<p class="pt-2 text-sm">
		<span class="font-semibold">
			{hours.toFixed(2)}
			hrs · ${total.toFixed(2)}
		</span>
		<span class="text-neutral-600">
			({result.found}
			timelapse{result.found === 1 ? "" : "s"}
			·
			{multiplier.toFixed(
				2
			)}x, ${rate.toFixed(2)}/hr)
		</span>
	</p>
	{#if result.missing.length > 0}
		<p class="text-xs text-amber-600">
			{result.missing.length}
			timelapse{result.missing.length === 1
				? ""
				: "s"}
			not found on Lapse — hours may be incomplete.
		</p>
	{/if}
{/if}

<script lang="ts">
import {
	buildCardGrants,
	type CardGrantSubmission,
	GRANT_RATE_PER_HOUR,
} from "#lib/cardGrants.js"

const { submissions }: { submissions: CardGrantSubmission[] } = $props()

const grants = $derived(buildCardGrants(submissions))
const processingCount = $derived(
	submissions.filter(sub => sub.status === "processing").length
)

let copied = $state(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
	try {
		await navigator.clipboard.writeText(grants.csv)
		copied = true
		clearTimeout(copiedTimer)
		copiedTimer = setTimeout(() => (copied = false), 1500)
	} catch {
		// Clipboard API unavailable (e.g. an insecure context); nothing to do.
	}
}

function download() {
	const url = URL.createObjectURL(
		new Blob([grants.csv], { type: "text/csv" })
	)
	const link = document.createElement("a")
	link.href = url
	link.download = "card_grants.csv"
	link.click()
	URL.revokeObjectURL(url)
}
</script>

<section class="pt-10">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="max-w-2xl">
			<h2 class="text-2xl">Grant cards</h2>
			<p class="pt-2 text-sm text-neutral-600">
				CSV of grant cards for submissions currently being processed.
				Amounts are the recorded hours spent × submission multiplier ×
				{GRANT_RATE_PER_HOUR}
				USD/hr.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-primary px-3 py-1 text-sm"
				disabled={grants.rows.length === 0}
				onclick={copy}
			>
				{copied ? "Copied!" : "Copy CSV"}
			</button>
			<button
				type="button"
				class="btn btn-secondary px-3 py-1 text-sm"
				disabled={grants.rows.length === 0}
				onclick={download}
			>
				Download
			</button>
		</div>
	</div>

	{#if processingCount === 0}
		<p class="pt-4 text-neutral-600">No submissions are being processed.</p>
	{:else}
		<p class="pt-4 text-sm text-neutral-600">
			{grants.rows.length}
			recipient{grants.rows.length === 1 ? "" : "s"}
			from
			{grants.submissionCount}
			of
			{processingCount}
			processing submission{processingCount === 1 ? "" : "s"}
			included · total ${(grants.totalCents / 100).toFixed(2)}.
		</p>
		{#if grants.skipped.length > 0}
			<p class="pt-1 text-sm text-amber-600">
				Skipped:
				{grants.skipped.map(s => `${s.name} (${s.reason})`).join(", ")}
			</p>
		{/if}

		<details class="pt-3">
			<summary class="cursor-pointer text-sm text-neutral-600">
				Preview CSV
			</summary>
			<pre
				class="mt-2 max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs"
			>{grants.csv}</pre>
		</details>
	{/if}
</section>

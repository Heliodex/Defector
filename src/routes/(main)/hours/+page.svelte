<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getMySubmissions, getTimelapses, submitHours } from "./hours.remote"

const timelapseData = $derived(await getTimelapses())
const submissions = $derived(await getMySubmissions())

const sinceLabel = $derived(
	timelapseData ? new Date(timelapseData.since).toLocaleDateString() : ""
)

let selected = $derived(submitHours.fields.timelapseIds.value() ?? [])

let elapsedHours = $derived(
	submissions.reduce((sum, s) => sum + (s.status === "approved" ? s.hours : 0), 0)
)

function formatDuration(seconds: number) {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.round(seconds % 60)

	return [hours, minutes, secs]
		.map((part, i) => (i === 0 ? part : String(part).padStart(2, "0")))
		.join(":")
}
</script>

<Head title="Hours" />

<h1 class="text-2xl">Track your hours</h1>

<p class="pt-4 text-sm opacity-70">
	Your participation reward is granted per verified hour. Submit the Lapse
	timelapses you recorded during the event and we'll verify the hours you
	worked.
</p>

<form {...submitHours} class="pt-8">
	{#if timelapseData.error}
		<p class="pb-4 text-red-500">{timelapseData.error}</p>
	{:else if timelapseData.timelapses.length === 0}
		<p class="pb-4">No timelapses found since {sinceLabel}.</p>
	{:else}
		<fieldset class="pb-8">
			<legend class="font-bold">
				Your timelapses (since {sinceLabel})
			</legend>
			<p class="pb-2 text-sm opacity-70">
				Select the timelapses you want to count toward your hours.
			</p>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each timelapseData.timelapses as t (t.id)}
					<label
						class="relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 p-2 transition-colors hover:border-yellow-600 has-checked:border-yellow-400"
					>
						<input
							{...submitHours.fields.timelapseIds.as("checkbox", t.id)}
							class="absolute top-2 left-2 z-10 size-5 accent-yellow-400"
						>
						{#if t.thumbnailUrl}
							<img
								src={t.thumbnailUrl}
								alt={t.name}
								class="aspect-video w-full rounded object-cover"
							>
						{:else}
							<div
								class="flex aspect-video w-full items-center justify-center rounded bg-zinc-800 text-sm text-zinc-500"
							>
								Processing…
							</div>
						{/if}
						<span class="pt-2 line-clamp-1 text-sm font-semibold"
							>{t.name}</span
						>
						<span class="text-xs opacity-70">
							{new Date(t.createdAt).toLocaleDateString()}
							·
							{formatDuration(t.duration)}
						</span>
					</label>
				{/each}
			</div>

			<p class="pt-2 text-sm opacity-70">
				{selected.length === 0
					? "No timelapses selected."
					: `${selected.length} timelapse${selected.length === 1 ? "" : "s"} selected.`}
			</p>
			{#each submitHours.fields.timelapseIds.issues() ?? [] as issue}
				<p class="pt-2 text-sm text-red-500">{issue.message}</p>
			{/each}
		</fieldset>
	{/if}

	{#if submitHours.fields.allIssues()?.length}
		<div class="pb-6" role="alert">
			<p class="font-bold text-red-500">Please fix the following issues:</p>
			<ul class="list-disc pl-6 text-sm text-red-500">
				{#each submitHours.fields.allIssues() ?? [] as issue}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if submitHours.result}
		<div class="pb-6 text-green-500">
			Submitted {submitHours.result.count} timelapse(s) totalling
			{submitHours.result.hours.toFixed(2)} hour(s). We'll let you know once
			they're verified.
		</div>
	{/if}

	<button
		disabled={!!timelapseData.error || submitHours.pending > 0}
		type="submit"
		class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400 font-bold {submitHours.pending > 0 ? 'bg-neutral-600 hover:bg-neutral-600 active:bg-neutral-600 opacity-60' : ''}"
	>
		{submitHours.pending > 0 ? "Submitting..." : "Submit hours"}
	</button>
</form>

<section class="pt-10">
	<h2 class="text-xl font-bold">Your submissions</h2>
	{#if elapsedHours > 0}
		<p class="pt-2 text-sm opacity-70">
			Verified total:
			<span class="font-semibold text-green-500">{elapsedHours.toFixed(2)}</span>
			hours.
		</p>
	{/if}
	{#if submissions.length === 0}
		<p class="pt-4 text-sm opacity-70">You haven't submitted any hours yet.</p>
	{:else}
		<ul class="pt-4 space-y-2">
			{#each submissions as s}
				<li
					class="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 p-3"
				>
					<div>
						<p class="font-semibold">{s.hours.toFixed(2)} hours</p>
						<p class="text-xs opacity-70">
							{new Date(s.created).toLocaleDateString()} · {s.lapseIds.length}
							timelapse(s)
						</p>
					</div>
					<span
						class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide {s.status === "approved"
							? "bg-green-900 text-green-300"
							: s.status === "rejected"
								? "bg-red-900 text-red-300"
								: "bg-zinc-800 text-zinc-300"}"
					>
						{s.status}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
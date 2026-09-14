<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getBots, getNps, getSubmissions } from "./admin.remote"
import Submission from "./Submission.svelte"

let submissions = $derived(await getSubmissions())
let bots = $derived(await getBots())
let nps = $derived(await getNps())

let statusFilter = $state("all")
let filteredSubmissions = $derived(
	statusFilter === "all"
		? submissions
		: submissions.filter(sub => sub.status === statusFilter)
)
</script>

<Head title="Admin" noindex />

<h1>Admin dashboard</h1>

<div
	class="mt-4 inline-flex flex-col rounded-xl border border-neutral-200 bg-white px-8 py-6 shadow-sm"
>
	<p class="text-sm font-bold tracking-wide text-neutral-600 uppercase">
		Net Promoter Score
	</p>
	<p
		class="text-7xl font-bold {nps == null
			? 'text-neutral-400'
			: nps >= 0
				? 'text-green-700'
				: 'text-red-600'}"
	>
		{nps == null ? "—" : Math.round(nps * 100)}
	</p>
	<p class="pt-1 text-sm text-neutral-500">
		{nps == null
			? "No survey responses yet."
			: "From the “how likely to recommend” answers."}
	</p>
</div>

<div class="flex flex-wrap items-center justify-between gap-4 pt-8">
	<h2 class="pb-0! text-2xl">Submissions</h2>

	<label class="flex items-center gap-2 text-sm text-neutral-600">
		Filter by status
		<select bind:value={statusFilter} class="w-auto! text-sm">
			<option value="all">All</option>
			<option value="pending">Pending</option>
			<option value="processing">Processing</option>
			<option value="approved">Approved</option>
			<option value="needschanges">Needs changes</option>
			<option value="rejected">Rejected</option>
		</select>
	</label>
</div>

{#if submissions.length === 0}
	<p class="pt-4">No submissions yet.</p>
{:else}
	<p class="pt-4 text-sm text-neutral-600">
		{submissions.filter(s => s.status === "pending").length}
		pending review.
	</p>
	{#if filteredSubmissions.length === 0}
		<p class="pt-4 text-neutral-600">
			No submissions with this status.
		</p>
	{:else}
		<div class="flex flex-col gap-6 pt-4">
			{#each filteredSubmissions as sub (sub.id)}
				<Submission {sub} />
			{/each}
		</div>
	{/if}
{/if}

<h2 class="pt-10 text-2xl">Bots</h2>

{#if bots.length === 0}
	<p class="pt-4">No bots have been submitted yet.</p>
{:else}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="text-left text-neutral-600">
				<th class="border-b border-neutral-200 p-3">Bot</th>
				<th class="border-b border-neutral-200 p-3">Owner</th>
				<th class="border-b border-neutral-200 p-3">Status</th>
				<th class="border-b border-neutral-200 p-3">Avg score</th>
				<th class="border-b border-neutral-200 p-3">W-L</th>
			</tr>
		</thead>
		<tbody>
			{#each bots as bot (bot.id)}
				<tr class="align-top">
					<td class="border-b border-neutral-300 p-3 font-semibold">
						<a href="/bot/{bot.id}">{truncate(bot.name)}</a>
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.ownerEmail ?? "—"}
					</td>
					<td class="border-b border-neutral-300 p-3 capitalize">
						{bot.active}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.meanScore.toFixed(3)}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.stats.wins}-{bot.stats.losses}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

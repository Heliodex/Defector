<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { goto } from "$app/navigation"
import { page } from "$app/state"
import {
	getBots,
	getNps,
	getSubmissionHours,
	getSubmissions,
} from "./admin.remote"
import CardGrants from "./CardGrants.svelte"
import Submission from "./Submission.svelte"

let submissions = $derived(await getSubmissions())
let bots = $derived(await getBots())
let nps = $derived(await getNps())

const statuses = [
	"pending",
	"processing",
	"approved",
	"needschanges",
	"rejected",
] as const

type StatusFilter = "all" | (typeof statuses)[number]

const initialStatus = page.url.searchParams.get("status")
let statusFilter = $state<StatusFilter>(
	initialStatus && (statuses as readonly string[]).includes(initialStatus)
		? (initialStatus as StatusFilter)
		: "all"
)

// Keep the active filter in the URL (?status=...) so it survives reloads.
function updateStatusFilter(value: StatusFilter) {
	statusFilter = value

	const url = new URL(page.url.href)
	if (value === "all") url.searchParams.delete("status")
	else url.searchParams.set("status", value)
	goto(url, { state: page.state, shallow: true, replace: true })
}

let filteredSubmissions = $derived(
	statusFilter === "all"
		? submissions
		: submissions.filter(sub => sub.status === statusFilter)
)

// Timelapse durations per submission, used by the stat cards as a fallback when
// a reviewer hasn't recorded an "Hours spent" value (stored as 0 when left empty).
// `getSubmissionHours` is the same cached query the per-submission cards use, so
// these don't cause any extra Lapse API calls.
const timelapseHours = $derived(
	new Map(
		await Promise.all(
			submissions.map(async sub => {
				if (sub.review?.hoursSpent) return [sub.id, 0] as const
				try {
					const { totalSeconds } = await getSubmissionHours(sub.id)
					return [sub.id, totalSeconds / 3600] as const
				} catch {
					// A failed lookup just falls back to 0 hours.
					return [sub.id, 0] as const
				}
			})
		)
	)
)

// Total hours per review state, for the dashboard stat cards. Admin-recorded
// "Hours spent" wins; otherwise we fall back to the submitted timelapse duration.
const hourStats = $derived.by(() => {
	const states = [
		{ status: "pending", label: "Pending review", colour: "text-blue-800" },
		{
			status: "needschanges",
			label: "Needs changes",
			colour: "text-yellow-800",
		},
		{ status: "processing", label: "Processing", colour: "text-sky-800" },
		{ status: "approved", label: "Approved", colour: "text-green-800" },
	] as const

	return states.map(({ status, label, colour }) => {
		const matching = submissions.filter(sub => sub.status === status)
		return {
			status,
			label,
			colour,
			hours: matching.reduce(
				(total, sub) =>
					total +
					(sub.review?.hoursSpent || timelapseHours.get(sub.id) || 0),
				0
			),
			count: matching.length,
		}
	})
})
</script>

<Head title="Admin" noindex />

<h1>Admin dashboard</h1>

<div class="pt-4 grid sm:grid-cols-2 items-stretch gap-4">
	<div
		class="inline-flex flex-col rounded-xl border border-neutral-200 bg-white px-8 py-6 shadow-sm"
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

	<div
		class="grid grid-cols-2 gap-x-12 gap-y-6 min-w-40 flex-col rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm"
	>
		{#each hourStats as stat (stat.status)}
			<div>
				<p
					class="text-xs font-bold tracking-wide text-neutral-600 uppercase"
				>
					{stat.label}
				</p>
				<p class="pt-2 text-4xl font-bold">
					<span class={stat.colour}>
						{stat.hours.toFixed(2)}
					</span>
					<span class="text-base font-normal text-neutral-500">
						hrs
					</span>
				</p>
				<p class="pt-1 text-xs text-neutral-500">
					{stat.count}
					submission{stat.count === 1 ? "" : "s"}
				</p>
			</div>
		{/each}
	</div>
</div>

<div class="flex flex-wrap items-center justify-between gap-4 pt-8">
	<h2 class="pb-0! text-2xl">Submissions</h2>

	<label class="flex items-center gap-2 text-sm text-neutral-600">
		Filter by status
		<select
			value={statusFilter}
			onchange={e =>
				updateStatusFilter(e.currentTarget.value as StatusFilter)}
			class="w-auto! text-sm"
		>
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
		<p class="pt-4 text-neutral-600">No submissions with this status.</p>
	{:else}
		<div class="flex flex-col gap-6 pt-4">
			{#each filteredSubmissions as sub (sub.id)}
				<Submission {sub} />
			{/each}
		</div>
	{/if}
{/if}

<CardGrants {submissions} />

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

<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getBots, getSubmissions } from "./admin.remote"
import Submission from "./Submission.svelte"

let submissions = $derived(await getSubmissions())
let bots = $derived(await getBots())
</script>

<Head title="Admin" noindex />

<h1>Admin dashboard</h1>

<h2 class="pt-8 text-2xl">Submissions</h2>

{#if submissions.length === 0}
	<p class="pt-4">No submissions yet.</p>
{:else}
	<p class="pt-4 text-sm text-neutral-600">
		{submissions.filter(s => s.status === "pending").length}
		pending review.
	</p>
	<div class="flex flex-col gap-6 pt-4">
		{#each submissions as sub (sub.id)}
			<Submission {sub} />
		{/each}
	</div>
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

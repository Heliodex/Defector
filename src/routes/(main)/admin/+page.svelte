<script lang="ts">
import Accordion from "#lib/components/Accordion.svelte"
import AccordionItem from "#lib/components/AccordionItem.svelte"
import Head from "#lib/components/Head.svelte"
import SubmissionCard from "#lib/components/SubmissionCard.svelte"
import { truncate } from "#lib/truncate.js"
import { getBots, getSubmissions, reviewForm } from "./admin.remote"
import SubmissionHours from "./SubmissionHours.svelte"

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
			<SubmissionCard
				{sub}
				subtitle="{sub.ownerEmail ?? "—"} · {sub.created}"
				imageSrc={sub.image?.hash
					? `/admin/images/${sub.image.hash}`
					: null}
			>
				{#snippet middle()}
					<svelte:boundary>
						<SubmissionHours
							submissionId={sub.id}
							multiplier={sub.leaderboard?.multiplier ?? 1}
						/>
						{#snippet pending()}
							<p class="pt-2 text-sm text-neutral-500">
								Loading hours…
							</p>
						{/snippet}
						{#snippet failed()}
							<p class="pt-2 text-sm text-red-500">
								Could not load hours.
							</p>
						{/snippet}
					</svelte:boundary>
					{#if sub.howHear ?? sub.howDoingWell ?? sub.howImprove}
						<Accordion class="pt-4">
							<AccordionItem
								title="Survey answers"
								class="border border-neutral-400 border-t-0"
							>
								<div class="flex flex-col gap-2 pt-2">
									{#if sub.howHear}
										<p>
											<span class="font-semibold">
												Heard via:
											</span>
											{sub.howHear}
										</p>
									{/if}
									{#if sub.howDoingWell}
										<p>
											<span class="font-semibold">
												Did well:
											</span>
											{sub.howDoingWell}
										</p>
									{/if}
									{#if sub.howImprove}
										<p>
											<span class="font-semibold">
												Improve:
											</span>
											{sub.howImprove}
										</p>
									{/if}
								</div>
							</AccordionItem>
						</Accordion>
					{/if}
				{/snippet}
				{#snippet footer()}
					{#if sub.review?.notes ?? sub.review?.privateNotes}
						<div
							class="flex flex-col gap-1 text-sm text-neutral-600 pb-6"
						>
							{#if sub.review?.notes}
								<p>
									<span class="font-semibold">
										Public notes:
									</span>
									{sub.review.notes}
								</p>
							{/if}
							{#if sub.review?.privateNotes}
								<p>
									<span class="font-semibold">
										Private notes:
									</span>
									{sub.review.privateNotes}
								</p>
							{/if}
						</div>
					{/if}

					{let thisReviewForm = reviewForm.for(sub.id)}
					<form
						{...thisReviewForm}
						class="flex flex-wrap items-end gap-3"
					>
						<input
							{...thisReviewForm.fields.id.as("hidden", sub.id)}
						>
						<label class="pb-1!">
							<span class="pb-1! text-xs">Status</span>
							<select
								{...thisReviewForm.fields.status.as("select")}
								class="w-32! text-sm"
								required
							>
								<option value="pending">Pend</option>
								<option value="approved">Approve</option>
								<option value="rejected">Reject</option>
							</select>
						</label>
						<label class="min-w-52 flex-1 pb-1!">
							<span class="pb-1! text-xs">
								Public notes (visible to submitter)
							</span>
							<textarea
								{...thisReviewForm.fields.notes.as("text")}
								class="w-full text-sm"
								rows="2"
								required
							></textarea>
						</label>
						<label class="min-w-52 flex-1 pb-1!">
							<span class="pb-1! text-xs">
								Private notes (admin only)
							</span>
							<textarea
								{...thisReviewForm.fields.privateNotes.as("text")}
								class="w-full text-sm"
								rows="2"
								required
							></textarea>
						</label>
						<button
							class="btn btn-primary px-3 py-1 text-sm"
							type="submit"
						>
							Save
						</button>
					</form>
				{/snippet}
			</SubmissionCard>
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

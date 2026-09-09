<script lang="ts">
import Accordion from "#lib/components/Accordion.svelte"
import AccordionItem from "#lib/components/AccordionItem.svelte"
import SubmissionCard from "#lib/components/SubmissionCard.svelte"
import { getSubmissions, reviewForm } from "./admin.remote"
import SubmissionHours from "./SubmissionHours.svelte"

let { sub }: { sub: Awaited<ReturnType<typeof getSubmissions>>[number] } =
	$props()
</script>

<SubmissionCard
	{sub}
	subtitle="{sub.ownerEmail ?? "—"} · {sub.created}"
	imageSrc={sub.image?.hash ? `/admin/images/${sub.image.hash}` : null}
>
	{#snippet middle()}
		<svelte:boundary>
			<SubmissionHours
				submissionId={sub.id}
				multiplier={sub.leaderboard?.multiplier ?? 1}
			/>
			{#snippet pending()}
				<p class="pt-2 text-sm text-neutral-500">Loading hours…</p>
			{/snippet}
			{#snippet failed()}
				<p class="pt-2 text-sm text-red-500">Could not load hours.</p>
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
								<span class="font-semibold"> Heard via: </span>
								{sub.howHear}
							</p>
						{/if}
						{#if sub.howDoingWell}
							<p>
								<span class="font-semibold"> Did well: </span>
								{sub.howDoingWell}
							</p>
						{/if}
						{#if sub.howImprove}
							<p>
								<span class="font-semibold"> Improve: </span>
								{sub.howImprove}
							</p>
						{/if}
					</div>
				</AccordionItem>
			</Accordion>
		{/if}
	{/snippet}
	{#snippet footer()}
		{#if sub.review?.notes || sub.review?.privateNotes}
			<div class="flex flex-col gap-1 text-sm text-neutral-600 pb-6">
				{#if sub.review?.notes}
					<p>
						<span class="font-semibold"> Public notes: </span>
						{sub.review.notes}
					</p>
				{/if}
				{#if sub.review?.privateNotes}
					<p>
						<span class="font-semibold"> Private notes: </span>
						{sub.review.privateNotes}
					</p>
				{/if}
			</div>
		{/if}

		{let thisReviewForm = reviewForm.for(sub.id)}
		<form {...thisReviewForm} class="flex flex-wrap items-end gap-3">
			<input {...thisReviewForm.fields.id.as("hidden", sub.id)}>
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
				></textarea>
			</label>
			<label class="min-w-52 flex-1 pb-1!">
				<span class="pb-1! text-xs"> Private notes (admin only) </span>
				<textarea
					{...thisReviewForm.fields.privateNotes.as("text")}
					class="w-full text-sm"
					rows="2"
				></textarea>
			</label>
			<button class="btn btn-primary px-3 py-1 text-sm" type="submit">
				Save
			</button>
		</form>
	{/snippet}
</SubmissionCard>

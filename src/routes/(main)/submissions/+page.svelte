<script lang="ts">
import Head from "#lib/components/Head.svelte"
import SubmissionCard from "#lib/components/SubmissionCard.svelte"
import { getYourSubmissions } from "./submissions.remote"

let submissions = $derived(await getYourSubmissions())
</script>

<Head title="Your submissions" noindex />

<h1>Your submissions</h1>

{#if submissions.length === 0}
	<p class="py-4">You haven't submitted any projects yet.</p>
	<a href="/submit" class="btn btn-primary inline-block">
		Submit your first project
	</a>
{:else}
	<p class="pt-4 text-sm text-neutral-600">
		{submissions.filter(s => s.status === "pending").length}
		pending review.
	</p>
	<div class="flex flex-col gap-6 pt-4">
		{#each submissions as sub (sub.id)}
			<SubmissionCard
				{sub}
				subtitle={sub.created}
				href="/submission/{sub.id}"
				imageSrc={sub.image?.hash
					? `/submissions/images/${sub.image.hash}`
					: null}
			>
				{#snippet footer()}
					{#if sub.status === "pending"}
						<p class="text-sm text-neutral-600">
							Your submission is waiting for review.
						</p>
					{:else if sub.status === "needschanges"}
						{#if sub.review?.notes}
							<p class="text-sm text-neutral-600">
								<span class="font-semibold">Review notes:</span>
								{sub.review.notes}
							</p>
						{/if}
						<p class="pt-2 text-sm text-amber-700">
							Changes have been requested for this submission.
							Update it and resubmit it for review.
						</p>
						<a
							href="/submissions/{sub.id}/edit"
							class="btn btn-primary mt-3 inline-block"
						>
							Update submission
						</a>
					{:else if sub.review?.notes}
						<p class="text-sm text-neutral-600">
							<span class="font-semibold">Review notes:</span>
							{sub.review.notes}
						</p>
					{/if}
				{/snippet}
			</SubmissionCard>
		{/each}
	</div>
{/if}

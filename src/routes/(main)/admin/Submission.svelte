<script lang="ts">
import { untrack } from "svelte"
import { siteUrl } from "#lib/assets/config.js"
import Accordion from "#lib/components/Accordion.svelte"
import AccordionItem from "#lib/components/AccordionItem.svelte"
import SubmissionCard from "#lib/components/SubmissionCard.svelte"
import { getSubmissions, reviewForm } from "./admin.remote"
import SubmissionHours from "./SubmissionHours.svelte"

const { sub }: { sub: Awaited<ReturnType<typeof getSubmissions>>[number] } =
	$props()

const thisReviewForm = $derived(reviewForm.for(sub.id))

$effect(() => {
	if (!sub.review) return
	const { notes, privateNotes } = sub.review

	untrack(() => {
		thisReviewForm.fields.notes.set(notes)
		thisReviewForm.fields.privateNotes.set(privateNotes)
	})
})

// The public page only shows approved submissions, so this link is only meaningful once approved.
const playableUrl = $derived(`${siteUrl}/submission/${sub.id}`)

const submissionData = $derived([
	{ key: "codeUrl", label: "Code URL", value: sub.codeUrl },
	{ key: "playableUrl", label: "Playable URL", value: playableUrl },
	{ key: "email", label: "Email address", value: sub.ownerEmail ?? "" },
	{
		key: "givenName",
		label: "First name",
		value: sub.ownerInfo?.givenName ?? "",
	},
	{
		key: "familyName",
		label: "Last name",
		value: sub.ownerInfo?.familyName ?? "",
	},
	{ key: "address", label: "Address", value: sub.ownerInfo?.address ?? "" },
	{
		key: "phoneNumber",
		label: "Phone number",
		value: sub.ownerInfo?.phoneNumber ?? "",
	},
	{
		key: "birthdate",
		label: "Birthday",
		value: sub.ownerInfo?.birthdate ?? "",
	},
	{ key: "description", label: "Description", value: sub.description },
])

let copied = $state<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy(key: string, value: string) {
	if (!value) return

	try {
		await navigator.clipboard.writeText(value)
		copied = key
		clearTimeout(copiedTimer)
		copiedTimer = setTimeout(() => (copied = null), 1500)
	} catch {
		// Clipboard API unavailable (e.g. an insecure context); nothing to do.
	}
}
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
		<Accordion class="pt-4 flex flex-col gap-4">
			{#if sub.howHear ?? sub.howDoingWell ?? sub.howImprove}
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
			{/if}
			<AccordionItem
				title="Submission data"
				class="border border-neutral-400 border-t-0"
			>
				<ul class="noul flex flex-col gap-2 pt-2">
					{#each submissionData as field (field.key)}
						<li class="flex items-center gap-3 text-sm">
							<span class="w-32 shrink-0 font-semibold">
								{field.label}
							</span>
							<span
								class="min-w-0 flex-1 truncate font-mono text-xs text-neutral-600"
								title={field.value}
							>
								{field.value || "—"}
							</span>
							<button
								type="button"
								class="btn btn-secondary shrink-0 px-3 py-1 text-xs"
								disabled={!field.value}
								onclick={() => copy(field.key, field.value)}
							>
								{copied === field.key ? "Copied!" : "Copy"}
							</button>
						</li>
					{/each}
				</ul>
			</AccordionItem>
		</Accordion>
	{/snippet}
	{#snippet footer()}
		{#if sub.review?.notes || sub.review?.privateNotes}
			<div
				class="grid sm:grid-cols-2 gap-3 text-sm text-neutral-600 pb-6 wrap-break-word"
			>
				<div>
					<span class="font-semibold">Public notes:</span>
					<p class="whitespace-pre-wrap pl-4">
						{sub.review?.notes ?? ""}
					</p>
				</div>
				<div>
					<span class="font-semibold">Private notes:</span>
					<p class="whitespace-pre-wrap pl-4">
						{sub.review?.privateNotes ?? ""}
					</p>
				</div>
			</div>
		{/if}

		<form {...thisReviewForm} class="flex flex-col gap-3">
			<input {...thisReviewForm.fields.id.as("hidden", sub.id)}>
			<div class="flex flex-wrap items-end gap-3">
				<label class="min-w-52 flex-1 pb-1!">
					<span class="pb-1! text-xs">
						Public notes (visible to submitter)
					</span>
					<textarea
						{...thisReviewForm.fields.notes.as("text")}
						class="w-full text-sm min-h-30"
					></textarea>
				</label>
				<label class="min-w-52 flex-1 pb-1!">
					<span class="pb-1! text-xs">
						Private notes (admin only)
					</span>
					<textarea
						{...thisReviewForm.fields.privateNotes.as("text")}
						class="w-full text-sm min-h-30"
					></textarea>
				</label>
			</div>
			<div class="flex flex-wrap items-end gap-3">
				<label class="pb-0!">
					<span class="pb-1! text-xs">Status</span>
					<select
						{...thisReviewForm.fields.status.as("select")}
						class="w-32! text-sm"
						required
					>
						<option value="pending">Pend</option>
						<option value="approved">Approve</option>
						<option value="needschanges">Needs changes</option>
						<option value="rejected">Reject</option>
					</select>
				</label>
				<button class="btn btn-primary px-3 py-1 text-sm" type="submit">
					Save
				</button>
			</div>
		</form>
	{/snippet}
</SubmissionCard>

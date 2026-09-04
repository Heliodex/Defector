<script lang="ts">
import { programmeName } from "#lib/assets/config.js"
import Head from "#lib/components/Head.svelte"
import { getBots, getTimelapses, newSubmissionForm } from "./submit.remote"

const timelapseData = $derived(await getTimelapses())
const bots = $derived(await getBots())

const sinceLabel = $derived(
	timelapseData ? new Date(timelapseData.since).toLocaleDateString() : ""
)

let selected = $derived(newSubmissionForm.fields.timelapseIds.value() ?? [])
let selectedBots = $derived(newSubmissionForm.fields.botIds.value() ?? [])

function formatDuration(seconds: number) {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.round(seconds % 60)

	return [hours, minutes, secs]
		.map((part, i) => (i === 0 ? part : String(part).padStart(2, "0")))
		.join(":")
}
</script>

<Head title="Submit your work" noindex />

<h1 class="text-2xl">Submit your work</h1>

<form {...newSubmissionForm} enctype="multipart/form-data" class="pt-8">
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
				Select the timelapses you want to submit for this project.
			</p>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each timelapseData.timelapses as t (t.id)}
					<label
						class="relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-300 bg-white p-2 transition-colors hover:border-blue-600 has-checked:border-blue-400"
					>
						<input
							{...newSubmissionForm.fields.timelapseIds.as("checkbox", t.id)}
							class="absolute top-2 left-2 z-10 size-5 accent-blue-600"
						>
						{#if t.thumbnailUrl}
							<img
								src={t.thumbnailUrl}
								alt={t.name}
								class="aspect-video w-full rounded object-cover"
							>
						{:else}
							<div
								class="flex aspect-video w-full items-center justify-center rounded bg-neutral-200 text-sm text-neutral-500"
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
			{#each newSubmissionForm.fields.timelapseIds.issues() ?? [] as issue}
				<p class="pt-2 text-sm text-red-500">{issue.message}</p>
			{/each}
		</fieldset>
	{/if}

	<fieldset class="pb-8">
		<legend class="font-bold">Your bots</legend>
		{#if bots.length === 0}
			<p class="pb-2 text-sm opacity-70">
				You have no unsubmitted bots left. Bots you've already submitted
				aren't shown here.
				<a href="/submit-bot" class="text-blue-400 hover:underline">
					Submit a new bot
				</a>
				to include it in a future hour submission.
			</p>
		{:else}
			<p class="pb-2 text-sm opacity-70">
				Select the bots you want to submit for this project. Bots you've
				already submitted aren't shown here.
			</p>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each bots as b (b.id)}
					<label
						class="relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-300 bg-white p-3 transition-colors hover:border-blue-600 has-checked:border-blue-400"
					>
						<input
							{...newSubmissionForm.fields.botIds.as("checkbox", b.id)}
							class="absolute top-3 left-3 size-5 accent-blue-600"
						>
						<span class="pl-7 line-clamp-1 text-sm font-semibold">
							{b.name}
						</span>
						<span class="pl-7 line-clamp-2 text-xs opacity-70">
							{b.description}
						</span>
						<span class="pl-7 pt-1 text-xs opacity-70 capitalize">
							{b.active}
							·
							{new Date(b.created).toLocaleDateString()}
						</span>
					</label>
				{/each}
			</div>

			<p class="pt-2 text-sm opacity-70">
				{selectedBots.length === 0
					? "No bots selected."
					: `${selectedBots.length} bot${selectedBots.length === 1 ? "" : "s"} selected.`}
			</p>
		{/if}
		{#each newSubmissionForm.fields.botIds.issues() ?? [] as issue}
			<p class="pt-2 text-sm text-red-500">{issue.message}</p>
		{/each}
	</fieldset>

	<label>
		<span>Submission image or screenshot</span>
		<input {...newSubmissionForm.fields.image.as("file")} required>
		{#each newSubmissionForm.fields.image.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-600">
			To clarify, a screenshot of your bot's battle page would be great!
			<br>
			We don't need to see the code, you can link it in the
			<b>Code URL</b>
			field below.
		</p>
	</label>

	<label>
		<span>Submission name</span>
		<input {...newSubmissionForm.fields.name.as("text")} required>
		{#each newSubmissionForm.fields.name.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-600">
			The name of the bots (or team of bots) which you are submitting.
		</p>
	</label>

	<label>
		<span>Submission description</span>
		<textarea
			{...newSubmissionForm.fields.description.as("text")}
			required
		></textarea>
		{#each newSubmissionForm.fields.description.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>Code URL</span>
		<input
			{...newSubmissionForm.fields.codeUrl.as("url")}
			placeholder="https://github.com/..."
			required
		>
		{#each newSubmissionForm.fields.codeUrl.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-600">
			A link to your project's code repository on GitHub or similar. It's
			recommended to create a repository and place your bot's scripts in
			it.
		</p>
	</label>

	<label>
		<span>
			<input {...newSubmissionForm.fields.ai.as("checkbox")}>
			<span class="pl-2"
				>I used generative AI in building this project</span
			>
		</span>
		{#each newSubmissionForm.fields.ai.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="text-sm text-neutral-600">
			Generally, up to 30% of the time spent on a project can be completed
			with generative AI assistance. Projects with more than 30% of their
			time attributed to AI code generation, or for which a significant
			portion of their final code is generated by AI, may have their
			rewarded hours manually adjusted.
		</p>
	</label>

	<label>
		<span>How did you hear about this programme?</span>
		<textarea {...newSubmissionForm.fields.howHear.as("text")}></textarea>
		{#each newSubmissionForm.fields.howHear.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>What do you think {programmeName} did well?</span>
		<textarea
			{...newSubmissionForm.fields.howDoingWell.as("text")}
		></textarea>
		{#each newSubmissionForm.fields.howDoingWell.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span
			>How could {programmeName} improve if it were to run again in
			future?</span
		>
		<textarea
			{...newSubmissionForm.fields.howImprove.as("text")}
		></textarea>
		{#each newSubmissionForm.fields.howImprove.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span
			>On a scale of 0 (least likely) to 10 (most likely), how likely
			would you be to recommend this programme (or a very similar future
			one) to a friend?</span
		>
		<input
			{...newSubmissionForm.fields.howLikelyRecommend.as("number")}
			required
			min="0"
			max="10"
			step="1"
		>
		{#each newSubmissionForm.fields.howLikelyRecommend.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	{#if newSubmissionForm.fields.allIssues()?.length}
		<div class="pb-6" role="alert">
			<p class="font-bold text-red-500">
				Please fix the following issues:
			</p>
			<ul class="list-disc pl-6 text-sm text-red-500">
				{#each newSubmissionForm.fields.allIssues() ?? [] as issue}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		disabled={!!timelapseData.error || bots.length === 0 ||
			newSubmissionForm.pending > 0}
		type="submit"
		class="btn btn-primary {newSubmissionForm.pending > 0 ? 'bg-neutral-200 text-neutral-500 hover:bg-neutral-200 active:bg-neutral-200 opacity-60' : ''}"
	>
		{newSubmissionForm.pending > 0 ? "Submitting..." : "Submit"}
	</button>
</form>

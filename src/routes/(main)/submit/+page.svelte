<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getTimelapses, newProjectForm } from "./submit.remote"

const timelapseData = $derived(await getTimelapses())

const sinceLabel = $derived(
	timelapseData ? new Date(timelapseData.since).toLocaleDateString() : ""
)

let selected = $derived(newProjectForm.fields.timelapseIds.value() ?? [])

function formatDuration(seconds: number) {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.round(seconds % 60)

	return [hours, minutes, secs]
		.map((part, i) => (i === 0 ? part : String(part).padStart(2, "0")))
		.join(":")
}
</script>

<Head title="Submit your project" />

<h1 class="text-2xl">Submit your project</h1>

<form {...newProjectForm} enctype="multipart/form-data" class="pt-8">
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
						class="relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 p-2 transition-colors hover:border-yellow-600 has-checked:border-yellow-400"
					>
						<input
							{...newProjectForm.fields.timelapseIds.as("checkbox", t.id)}
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
			{#each newProjectForm.fields.timelapseIds.issues() ?? [] as issue}
				<p class="pt-2 text-sm text-red-500">{issue.message}</p>
			{/each}
		</fieldset>
	{/if}

	<label>
		<span>Project image or screenshot</span>
		<input {...newProjectForm.fields.image.as("file")} required>
		{#each newProjectForm.fields.image.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-400">
			To clarify, a screenshot of the working output or a demo page made
			with your tool/framework would be great!
			<br>
			We don't need to see the code, you can link it in the
			<b>Code URL</b>
			field below.
		</p>
	</label>

	<label>
		<span>Project name</span>
		<input {...newProjectForm.fields.name.as("text")} required>
		{#each newProjectForm.fields.name.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>Project description</span>
		<textarea
			{...newProjectForm.fields.description.as("text")}
			required
		></textarea>
		{#each newProjectForm.fields.description.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>Code URL</span>
		<input
			{...newProjectForm.fields.codeUrl.as("url")}
			placeholder="https://github.com/..."
			required
		>
		{#each newProjectForm.fields.codeUrl.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-400">
			A link to your project's code repository on GitHub or similar.
		</p>
	</label>

	<label>
		<span>Playable URL</span>
		<input
			{...newProjectForm.fields.playableUrl.as("url")}
			placeholder="https://example.com/..."
			required
		>
		{#each newProjectForm.fields.playableUrl.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<div class="pt-2 text-sm text-neutral-400">
			<p>
				Somewhere where we can see the working output (not just the
				code) of your project.
				<br>
				If you have your HTML and JS files ready, you can try the
				following to get it deployed quickly:
			</p>
			<ul>
				<li>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://app.netlify.com/drop"
						>Netlify Drop</a
					>
				</li>
				<li>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://cloudflare.com/drop/"
						>Cloudflare Drop</a
					>
				</li>
				<li>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://vercel.com/drop"
						>Vercel Drop</a
					>
				</li>
				<li>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://docs.github.com/en/pages"
						>GitHub Pages</a
					>
				</li>
			</ul>
			<p>
				otherwise, don't hesitate to ask for assistance in
				<a
					target="_blank"
					rel="noreferrer"
					href="https://app.slack.com/client/E09V59WQY1E/C0BQWJW532R"
					>#ysws-power-tools-help</a
				>!
			</p>
		</div>
	</label>

	<label>
		<span>
			<input {...newProjectForm.fields.ai.as("checkbox")}>
			<span class="pl-2"
				>I used generative AI in building this project</span
			>
		</span>
		{#each newProjectForm.fields.ai.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="text-sm text-neutral-400">
			Generally, up to 30% of the time spent on a project can be completed
			with generative AI assistance. Projects with more than 30% of their
			time attributed to AI code generation may have their rewarded hours
			manually adjusted.
		</p>
	</label>

	<label>
		<span>Extra reviewer notes</span>
		<textarea
			{...newProjectForm.fields.reviewerNotes.as("text")}
		></textarea>
		{#each newProjectForm.fields.reviewerNotes.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-400">
			Add anything else here you'd like us to know about your project.
		</p>
	</label>

	<hr>

	<label>
		<span>How did you hear about this programme?</span>
		<textarea {...newProjectForm.fields.howHear.as("text")}></textarea>
		{#each newProjectForm.fields.howHear.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>How are we doing well?</span>
		<textarea {...newProjectForm.fields.howDoingWell.as("text")}></textarea>
		{#each newProjectForm.fields.howDoingWell.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>How can we improve?</span>
		<textarea {...newProjectForm.fields.howImprove.as("text")}></textarea>
		{#each newProjectForm.fields.howImprove.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span
			>On a scale of 1 (least likely) to 10 (most likely), how likely
			would you be to recommend this programme (or a very similar future
			one) to a friend?</span
		>
		<input
			{...newProjectForm.fields.howLikelyRecommend.as("number")}
			min="1"
			max="10"
			step="1"
		>
		{#each newProjectForm.fields.howLikelyRecommend.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	{#if newProjectForm.fields.allIssues()?.length}
		<div class="pb-6" role="alert">
			<p class="font-bold text-red-500">
				Please fix the following issues:
			</p>
			<ul class="list-disc pl-6 text-sm text-red-500">
				{#each newProjectForm.fields.allIssues() ?? [] as issue}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		disabled={!!timelapseData.error || newProjectForm.pending > 0}
		type="submit"
		class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400 font-bold {newProjectForm.pending > 0 ? 'bg-neutral-600 hover:bg-neutral-600 active:bg-neutral-600 opacity-60' : ''}"
	>
		{newProjectForm.pending > 0 ? "Submitting..." : "Submit"}
	</button>
</form>

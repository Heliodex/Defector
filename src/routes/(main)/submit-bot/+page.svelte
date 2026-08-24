<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { newBotForm } from "./bot.remote"
</script>

<Head title="Submit a bot" />

<h1 class="text-2xl">Submit a bot</h1>

<p class="pt-2 pb-8 text-sm text-neutral-600">
	Write a bot that plays the Iterated Prisoner's Dilemma against other bots
	and fight for the top of the ladder. You can have up to 3 active bots at
	once. Already have bots?
	<a href="/your-bots">View your bots</a>.
</p>

{#if newBotForm.result}
	<div class="pb-6" role="status">
		<p class="font-bold">
			Your bot
			<a href="/bot/{newBotForm.result.id}" class="text-blue-400"
				>{newBotForm.result.id}</a
			>
			was created!
		</p>
		<p class="text-sm">
			<a href="/your-bots" class="text-blue-400"
				>Go to your bots to manage it</a
			>.
		</p>
	</div>
{/if}

<form {...newBotForm} class="pt-8">
	<label>
		<span>Name</span>
		<input {...newBotForm.fields.name.as("text")} required>
		{#each newBotForm.fields.name.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>Description</span>
		<textarea
			{...newBotForm.fields.description.as("text")}
			required
		></textarea>
		{#each newBotForm.fields.description.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	<label>
		<span>Code</span>
		<textarea
			{...newBotForm.fields.code.as("text")}
			class="font-mono"
			rows="14"
			required
			placeholder={`export default (state) => {
	// return "C" to cooperate, "D" to defect
	return "C";
};`}
		></textarea>
		{#each newBotForm.fields.code.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<div class="pt-2 text-sm text-neutral-600">
			<p class="pb-2">
				Your bot is a function
				<code class="font-mono">(state) =&gt; [move, memory]</code>
				that returns
				<code class="font-mono">"C"</code>
				(cooperate) or
				<code class="font-mono">"D"</code>
				(defect).
			</p>
			<ul class="list-disc pl-6">
				<li>Battles last 100 rounds. Your bot plays one per battle.</li>
				<li>
					<code class="font-mono">state</code>
					contains the round number, your previous memory, and your
					opponent's previous moves.
				</li>
				<li>
					Return
					<code class="font-mono">[move, memory]</code>
					to update.
					<code class="font-mono">memory</code>
					is persisted between rounds.
				</li>
				<li>
					No
					<code class="font-mono">fetch</code>
					,
					<code class="font-mono">import</code>
					, or
					<code class="font-mono">eval</code>
					— the sandbox is isolated.
				</li>
			</ul>
		</div>
	</label>

	<label>
		<span>Code URL (optional)</span>
		<input
			{...newBotForm.fields.codeUrl.as("url")}
			placeholder="https://github.com/..."
		>
		{#each newBotForm.fields.codeUrl.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
		<p class="pt-2 text-sm text-neutral-600">
			A link to your bot's source, if you'd like to share it.
		</p>
	</label>

	<label>
		<span>
			<input {...newBotForm.fields.active.as("checkbox")}>
			<span class="pl-2">Enter tournament immediately</span>
		</span>
		{#each newBotForm.fields.active.issues() ?? [] as issue}
			<span class="pt-2 text-sm text-red-500">{issue.message}</span>
		{/each}
	</label>

	{#if newBotForm.fields.allIssues()?.length}
		<div class="pb-6" role="alert">
			<p class="font-bold text-red-500">
				Please fix the following issues:
			</p>
			<ul class="list-disc pl-6 text-sm text-red-500">
				{#each newBotForm.fields.allIssues() ?? [] as issue}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		disabled={newBotForm.pending > 0}
		type="submit"
		class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400 font-bold {newBotForm.pending > 0 ? 'bg-neutral-300 hover:bg-neutral-300 active:bg-neutral-300 opacity-60' : ''}"
	>
		{newBotForm.pending > 0 ? "Submitting..." : "Submit"}
	</button>
</form>

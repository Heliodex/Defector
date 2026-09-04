<script lang="ts">
import { botStatuses } from "#lib/botStatus.js"
import { truncate } from "#lib/truncate.js"
import {
	type MyBot,
	setStatusForm,
} from "../../routes/(main)/your-bots/myBots.remote"

const { bot }: { bot: MyBot } = $props()

const botForm = $derived(setStatusForm.for(bot.id))
</script>

{#snippet stats()}
	<div class="pt-3 text-sm">
		<p>
			<span class="font-semibold">
				{bot.meanScore.toFixed(3)}
			</span>
			Avg score
		</p>
		<p>
			<span class="font-semibold">
				{bot.stats.wins}
			</span>
			wins
		</p>
		<p>
			<span class="font-semibold">
				{bot.stats.losses}
			</span>
			losses
		</p>
		<p>
			<span class="font-semibold">
				{bot.stats.battles}
			</span>
			battles
		</p>

		<div class="pt-4">
			<a
				href="/bot/{bot.id}"
				class="text-sm text-blue-400 hover:underline"
			>
				View
			</a>
		</div>
	</div>
{/snippet}

<li class="rounded-lg border border-neutral-300 bg-white p-4 flex flex-col">
	{#if botForm.fields.allIssues()?.length}
		<div class="pb-6" role="alert">
			<p class="font-bold text-red-500">
				Please fix the following issues:
			</p>
			<ul class="list-disc pl-6 text-sm text-red-500">
				{#each botForm.fields.allIssues() ?? [] as issue}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="font-semibold">
				<a href="/bot/{bot.id}" class="hover:text-blue-400"
					>{truncate(bot.name)}</a
				>
			</h2>
			<p class="text-xs opacity-70">
				Created {new Date(bot.created).toLocaleDateString()}
			</p>
		</div>
		{#if bot.active === "active"}
			<span
				class="rounded bg-green-600 text-white px-2 py-0.5 text-xs font-bold"
				>Active</span
			>
		{:else if bot.active === "archived"}
			<span
				class="rounded bg-amber-500 text-white px-2 py-0.5 text-xs font-bold"
				>Archived</span
			>
		{:else}
			<span class="rounded bg-zinc-300 px-2 py-0.5 text-xs font-bold"
				>Inactive</span
			>
		{/if}
	</div>

	<p class="pt-2 text-sm text-neutral-600">{bot.description}</p>

	<div class="flex justify-between items-end">
		{@render stats()}
		<form {...botForm}>
			<input {...botForm.fields.id.as("hidden", bot.id)}>
			{#if bot.active === "archived"}
				<input {...botForm.fields.status.as("hidden", "inactive")}>
				<button
					class="btn btn-secondary text-sm px-3 py-1"
					type="submit"
				>
					Restore
				</button>
			{:else}
				<fieldset class="flex flex-col text-sm pb-4">
					<legend class="sr-only">Bot status</legend>
					{#each botStatuses as status}
						<label class="nolabel">
							<input
								{...botForm.fields.status.as(
									"radio",
									status
								)}
								checked={bot.active === status}
							>
							<span class="capitalize pt-1.5">{status}</span>
						</label>
					{/each}
				</fieldset>
				<button class="btn btn-primary text-sm px-3 py-1" type="submit">
					Save
				</button>
			{/if}
		</form>
	</div>
</li>

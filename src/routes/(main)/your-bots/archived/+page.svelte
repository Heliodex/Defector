<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getArchivedBots, setStatusForm } from "../myBots.remote"

const bots = $derived(await getArchivedBots())
</script>

<Head title="Archived bots" noindex />

<h1 class="text-2xl">Archived bots</h1>

<p class="pt-2 pb-2 text-sm text-neutral-600">
	Archived bots sit out of the tournament and don't count towards your
	3-active-bot limit. Restore one to bring it back.
</p>

<p class="pb-2">
	<a href="/your-bots" class="text-sm text-blue-400 hover:underline">
		Back to My bots
	</a>
</p>

{#if !bots || bots.length === 0}
	<div class="pt-4">
		<p class="pb-4">You don't have any archived bots.</p>
	</div>
{:else}
	<ul class="noul grid gap-4 pt-4 sm:grid-cols-2">
		{#each bots as bot (bot.id)}
			{let botForm = setStatusForm.for(bot.id)}
			<li
				class="rounded-lg border border-neutral-300 bg-white p-4 flex flex-col"
			>
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
					<span
						class="rounded bg-amber-500 text-white px-2 py-0.5 text-xs font-bold"
						>Archived</span
					>
				</div>

				<p class="pt-2 text-sm text-neutral-600">{bot.description}</p>

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
						wins ·
						<span class="font-semibold">
							{bot.stats.losses}
						</span>
						losses ·
						<span class="font-semibold">
							{bot.stats.battles}
						</span>
						battles
					</p>
				</div>

				<div
					class="flex items-center justify-between gap-4 pt-3 mt-auto"
				>
					<a
						href="/bot/{bot.id}"
						class="text-sm text-blue-400 hover:underline"
					>
						View
					</a>

					<form {...botForm} class="inline-flex items-center gap-2">
						<input {...botForm.fields.id.as("hidden", bot.id)}>
						<input
							{...botForm.fields.status.as("hidden", "inactive")}
						>
						<button
							class="btn btn-secondary text-sm px-3 py-1"
							type="submit"
						>
							Restore
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

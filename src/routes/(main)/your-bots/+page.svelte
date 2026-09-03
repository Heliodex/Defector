<script lang="ts">
import { botStatuses } from "#lib/botStatus.js"
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getMyBots, setStatusForm } from "./myBots.remote"

const bots = $derived(await getMyBots())

const activeCount = $derived(
	bots?.filter(b => b.active === "active").length ?? 0
)
</script>

<Head title="Your bots" noindex />

<h1 class="text-2xl">Your bots</h1>

<p class="pt-2 pb-2 text-sm text-neutral-600">
	You may have at most 3 active bots at once ({activeCount}/3 active).
</p>

{#if activeCount >= 3}
	<p class="pb-4 text-sm font-bold text-blue-600">
		You've hit the 3-active-bot limit. Deactivate one before activating
		another.
	</p>
{/if}

{#if !bots || bots.length === 0}
	<div class="pt-4">
		<p class="pb-4">You haven't submitted any bots yet.</p>
		<a href="/submit-bot" class="btn btn-primary">
			Submit your first bot
		</a>
		<p class="pt-4">
			<a href="/your-bots/archived" class="text-blue-400 hover:underline"
				>View archived bots</a
			>
		</p>
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
					{#if bot.active === "active"}
						<span
							class="rounded bg-green-600 text-white px-2 py-0.5 text-xs font-bold"
							>Active</span
						>
					{:else}
						<span
							class="rounded bg-zinc-300 px-2 py-0.5 text-xs font-bold"
							>Inactive</span
						>
					{/if}
				</div>

				<p class="pt-2 text-sm text-neutral-600">{bot.description}</p>

				<div class="flex justify-between ">
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

					<form {...botForm}>
						<input {...botForm.fields.id.as("hidden", bot.id)}>
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
									<span class="capitalize pt-1.5"
										>{status}</span
									>
								</label>
							{/each}
						</fieldset>
						<button
							class="btn btn-primary text-sm px-3 py-1"
							type="submit"
						>
							Save
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>

	<p class="pt-6 flex gap-4">
		<a href="/submit-bot" class="text-blue-400 hover:underline"
			>Submit a new bot</a
		>
		<a href="/your-bots/archived" class="text-blue-400 hover:underline"
			>View archived bots</a
		>
	</p>
{/if}

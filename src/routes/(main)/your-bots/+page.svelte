<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getMyBots, toggleActiveForm } from "./myBots.remote"

const bots = $derived(await getMyBots())

const activeCount = $derived(bots?.filter(b => b.active).length ?? 0)
</script>

<Head title="My bots" />

<h1 class="text-2xl">My bots</h1>

<p class="pt-2 pb-2 text-sm text-neutral-600">
	You may have at most 3 active bots at once ({activeCount}/3 active).
</p>

{#if activeCount >= 3}
	<p class="pb-4 text-sm font-bold text-blue-600">
		You've hit the 3-active-bot limit. Deactivate one before activating
		another.
	</p>
{/if}

{#if toggleActiveForm.fields.allIssues()?.length}
	<div class="pb-6" role="alert">
		<p class="font-bold text-red-500">Please fix the following issues:</p>
		<ul class="list-disc pl-6 text-sm text-red-500">
			{#each toggleActiveForm.fields.allIssues() ?? [] as issue}
				<li>{issue.message}</li>
			{/each}
		</ul>
	</div>
{/if}

{#if !bots || bots.length === 0}
	<div class="pt-4">
		<p class="pb-2">You haven't submitted any bots yet.</p>
		<a
			href="/submit-bot"
			class="btn btn-primary"
		>
			Submit your first bot
		</a>
	</div>
{:else}
	<ul class="grid gap-4 pt-4 sm:grid-cols-2">
		{#each bots as bot (bot.id)}
			<li class="rounded-lg border border-neutral-300 bg-white p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="font-semibold">
							<a href="/bot/{bot.id}" class="hover:text-blue-400"
								>{bot.name}</a
							>
						</h2>
						<p class="text-xs opacity-70">
							Created {new Date(bot.created).toLocaleDateString()}
						</p>
					</div>
					{#if bot.active}
						<span
							class="rounded bg-green-600 px-2 py-0.5 text-xs font-bold"
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

				<div class="pt-3 text-sm">
					<p>
						<span class="font-semibold">Elo</span>
						{bot.elo.toFixed(0)}
					</p>
					<p>
						<span class="font-semibold">Wins</span>
						{bot.wins}
						·
						<span class="font-semibold">Losses</span>
						{bot.losses}
						·
						<span class="font-semibold">Battles</span>
						{bot.totalBattles}
					</p>
				</div>

				<div class="flex items-center gap-4 pt-3">
					<a
						href="/bot/{bot.id}"
						class="text-sm text-blue-400 hover:underline"
					>
						View
					</a>

					<form
						{...toggleActiveForm}
						class="inline-flex items-center gap-2"
					>
						<input
							{...toggleActiveForm.fields.id.as("hidden", bot.id)}
						>
						<label class="pb-0!">
							<input
								{...toggleActiveForm.fields.active.as("checkbox")}
								checked={bot.active}
							>
							<span class="pl-2"
								>{bot.active ? "Deactivate" : "Activate"}</span
							>
						</label>
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

	<p class="pt-6">
		<a href="/submit-bot" class="text-blue-400 hover:underline"
			>Submit a new bot</a
		>
	</p>
{/if}

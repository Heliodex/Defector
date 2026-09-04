<script lang="ts">
import Accordion from "#lib/components/Accordion.svelte"
import AccordionItem from "#lib/components/AccordionItem.svelte"
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getBots, getSubmissions, reviewForm } from "./admin.remote"

let submissions = $derived(await getSubmissions())
let bots = $derived(await getBots())
</script>

<Head title="Admin" noindex />

<h1>Admin dashboard</h1>

<h2 class="pt-8 text-2xl">Submissions</h2>

{#if submissions.length === 0}
	<p class="pt-4">No submissions yet.</p>
{:else}
	<p class="pt-4 text-sm text-neutral-600">
		{submissions.filter(s => s.status === "pending").length}
		pending review.
	</p>
	<div class="flex flex-col gap-6 pt-4">
		{#each submissions as sub (sub.id)}
			<article
				class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0">
						<h3 class="text-xl font-semibold wrap-break-word">
							{sub.name}
						</h3>
						<p class="pt-1 text-sm text-neutral-600">
							{sub.ownerEmail ?? "—"}
							· {sub.created}
						</p>
					</div>
					<span
						class="rounded-full px-3 py-1 text-xs font-bold {sub.status === "approved" ? "bg-green-100 text-green-800" : sub.status === "rejected" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"}"
						>{sub.status}</span
					>
				</div>

				{#if sub.leaderboard}
					<p class="pt-2 text-sm font-semibold text-green-700">
						{sub.leaderboard.multiplier.toFixed(2)}x reward (${(
							4 * sub.leaderboard.multiplier
						).toFixed(2)}/hr)
						{#if sub.leaderboard.bestRank != null}
							<span class="font-normal text-neutral-600">
								· best bot #{sub.leaderboard.bestRank}
								of {sub.leaderboard.rankedCount}
								ranked
							</span>
						{:else}
							<span class="font-normal text-neutral-600">
								· no ranked bots
							</span>
						{/if}
					</p>
				{/if}

				<p class="pt-3 whitespace-pre-wrap wrap-break-word">
					{sub.description}
				</p>

				{#if sub.image?.hash}
					<img
						src="/admin/images/{sub.image.hash}"
						alt="{sub.name} submission"
						loading="lazy"
						class="mt-3 w-full max-w-md rounded-lg object-cover"
					>
				{/if}

				<dl
					class="grid grid-cols-2 gap-x-6 gap-y-4 py-4 text-sm sm:grid-cols-4"
				>
					<div>
						<dt class="text-neutral-600">Links</dt>
						<dd class="font-semibold">
							<a
								href={sub.codeUrl}
								target="_blank"
								rel="noreferrer"
								>Code</a
							>
						</dd>
					</div>
					<div>
						<dt class="text-neutral-600">AI</dt>
						<dd class="font-semibold">{sub.ai ? "Yes" : "No"}</dd>
					</div>
					<div>
						<dt class="text-neutral-600">Recommend</dt>
						<dd class="font-semibold">
							{sub.howLikelyRecommend ?? "—"}/10
						</dd>
					</div>
					<div>
						<dt class="text-neutral-600">Timelapses</dt>
						<dd class="font-semibold">
							{sub.lapseTimelapses?.length ?? 0}
						</dd>
					</div>
					<div>
						<dt class="text-neutral-600">Hotel</dt>
						<dd class="font-semibold">Trivago</dd>
					</div>
				</dl>

				{#if sub.howHear ?? sub.howDoingWell ?? sub.howImprove}
					<Accordion class="pt-4">
						<AccordionItem
							title="Survey answers"
							class="border border-neutral-400 border-t-0"
						>
							<div class="flex flex-col gap-2 pt-2">
								{#if sub.howHear}
									<p>
										<span class="font-semibold">
											Heard via:
										</span>
										{sub.howHear}
									</p>
								{/if}
								{#if sub.howDoingWell}
									<p>
										<span class="font-semibold">
											Did well:
										</span>
										{sub.howDoingWell}
									</p>
								{/if}
								{#if sub.howImprove}
									<p>
										<span class="font-semibold">
											Improve:
										</span>
										{sub.howImprove}
									</p>
								{/if}
							</div>
						</AccordionItem>
					</Accordion>
				{/if}

				<div class="grid gap-4 pt-4 sm:grid-cols-2">
					<div>
						<h4 class="text-sm font-bold">Bots</h4>
						{#if sub.bots?.length}
							<ul class="flex flex-col gap-1 pt-1">
								{#each sub.bots as bot (bot.id)}
									<li class="text-sm">
										<a
											href="/bot/{bot.id}"
											target="_blank"
											rel="noreferrer"
											class="font-semibold"
											>{bot.name}</a
										>
										{#if bot.rank != null}
											<span class="text-green-700">
												#{bot.rank}
												· {bot.multiplier.toFixed(2)}x
											</span>
										{:else}
											<span class="text-neutral-500">
												unranked · 1.00x
											</span>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="pt-1 text-sm text-neutral-500">—</p>
						{/if}
					</div>
					<div>
						<h4 class="text-sm font-bold">
							Timelapses ({sub.lapseTimelapses?.length ?? 0})
						</h4>
						{#if sub.lapseTimelapses?.length}
							<ul class="flex flex-col gap-1 pt-1">
								{#each sub.lapseTimelapses as id (id)}
									<li class="font-mono text-xs break-all">
										<a
											href="https://lapse.hackclub.com/timelapse/{id}"
											target="_blank"
											rel="noreferrer"
											>{id}</a
										>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="pt-1 text-sm text-neutral-500">—</p>
						{/if}
					</div>
				</div>

				<div class="mt-4 border-t border-neutral-200 pt-4">
					{#if sub.status === "pending"}
						<form
							{...reviewForm}
							class="flex flex-wrap items-end gap-3"
						>
							<input
								{...reviewForm.fields.id.as("hidden", sub.id)}
							>
							<label class="pb-1!">
								<span class="pb-1! text-xs">Status</span>
								<select
									{...reviewForm.fields.status.as("select")}
									class="w-32! text-sm"
								>
									<option value="approved">Approve</option>
									<option value="rejected">Reject</option>
								</select>
							</label>
							<label class="min-w-52 flex-1 pb-1!">
								<span class="pb-1! text-xs">Notes</span>
								<textarea
									{...reviewForm.fields.notes.as("text")}
									class="w-full text-sm"
									rows="2"
									placeholder="Optional"
								></textarea>
							</label>
							<button
								class="btn btn-primary px-3 py-1 text-sm"
								type="submit"
							>
								Save
							</button>
						</form>
					{:else if sub.review?.notes}
						<p class="text-sm text-neutral-600">
							<span class="font-semibold">Review notes:</span>
							{sub.review.notes}
						</p>
					{/if}
				</div>
			</article>
		{/each}
	</div>
{/if}

<h2 class="pt-10 text-2xl">Bots</h2>

{#if bots.length === 0}
	<p class="pt-4">No bots have been submitted yet.</p>
{:else}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="text-left text-neutral-600">
				<th class="border-b border-neutral-200 p-3">Bot</th>
				<th class="border-b border-neutral-200 p-3">Owner</th>
				<th class="border-b border-neutral-200 p-3">Status</th>
				<th class="border-b border-neutral-200 p-3">Avg score</th>
				<th class="border-b border-neutral-200 p-3">W-L</th>
			</tr>
		</thead>
		<tbody>
			{#each bots as bot (bot.id)}
				<tr class="align-top">
					<td class="border-b border-neutral-300 p-3 font-semibold">
						<a href="/bot/{bot.id}">{truncate(bot.name)}</a>
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.ownerEmail ?? "—"}
					</td>
					<td class="border-b border-neutral-300 p-3 capitalize">
						{bot.active}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.meanScore.toFixed(3)}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.stats.wins}-{bot.stats.losses}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

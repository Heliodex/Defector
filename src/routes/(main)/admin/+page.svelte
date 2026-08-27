<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { truncate } from "#lib/truncate.js"
import { getBattles, getBots, getSubmissions, reviewForm } from "./admin.remote"

let submissions = $derived(await getSubmissions())
let bots = $derived(await getBots())
let battles = $derived(await getBattles())
</script>

<Head title="Admin" />

<h1>Admin dashboard</h1>

<h2 class="pt-8 text-2xl">Submissions</h2>

{#if submissions.length === 0}
	<p class="pt-4">No submissions yet.</p>
{:else}
	<div class="relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip">
		<div class="overflow-x-auto px-4 sm:px-6">
			<table class="w-full min-w-250 border-collapse text-sm">
				<thead>
					<tr class="text-left text-neutral-600">
						<th class="border-b border-neutral-200 p-3">
							Submission
						</th>
						<th class="border-b border-neutral-200 p-3">Owner</th>
						<th class="border-b border-neutral-200 p-3">AI</th>
						<th class="border-b border-neutral-200 p-3">
							Timelapses
						</th>
						<th class="border-b border-neutral-200 p-3">Status</th>
						<th class="border-b border-neutral-200 p-3">Review</th>
					</tr>
				</thead>
				<tbody>
					{#each submissions as sub (sub.id)}
						<tr class="align-top">
							<td class="border-b border-neutral-300 p-3">
								<h3
									class="text-lg! pb-0! font-semibold text-blue-600"
								>
									{sub.name}
								</h3>
								<p class="pt-1 text-neutral-600">
									{sub.description}
								</p>
								{#if sub.image?.hash}
									<img
										src={`/admin/images/${sub.image.hash}`}
										alt={`${sub.name} submission image`}
										class="mt-2 aspect-video w-48 rounded object-cover"
									>
								{/if}
								<div class="pt-2 text-xs">
									{#if sub.playableUrl}
										<a
											href={sub.playableUrl}
											target="_blank"
											rel="noreferrer"
											class="break-all"
											>Playable</a
										>
										<br>
									{/if}
									{#if sub.codeUrl}
										<a
											href={sub.codeUrl}
											target="_blank"
											rel="noreferrer"
											class="break-all"
											>Code</a
										>
									{/if}
								</div>
								<p class="pt-2 text-xs text-neutral-600">
									{sub.created}
								</p>
							</td>

							<td class="border-b border-neutral-300 p-3">
								{sub.ownerEmail ?? "—"}
							</td>

							<td class="border-b border-neutral-300 p-3">
								{sub.ai ? "Yes" : "No"}
							</td>

							<td class="border-b border-neutral-300 p-3">
								{#if sub.lapseTimelapses?.length}
									<ul class="flex flex-col gap-1">
										{#each sub.lapseTimelapses as id}
											<li
												class="font-mono text-xs break-all"
											>
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
									—
								{/if}
							</td>

							<td class="border-b border-neutral-300 p-3">
								<span
									class="font-bold {sub.status === "approved" ? '' : sub.status === "rejected" ? 'text-red-400' : 'text-blue-600'}"
									>{sub.status}</span
								>
								{#if sub.review?.notes}
									<p class="pt-1 text-xs text-neutral-600">
										{sub.review.notes}
									</p>
								{/if}
							</td>

							<td class="border-b border-neutral-300 p-3">
								{#if sub.status === "pending"}
									<form {...reviewForm}>
										<input
											{...reviewForm.fields.id.as(
												"hidden",
												sub.id
											)}
										>
										<label class="pb-1!">
											<span class="pb-1! text-xs"
												>Status</span
											>
											<select
												{...reviewForm.fields.status.as(
													"select"
												)}
												class="w-32! text-sm"
											>
												<option value="approved">
													Approve
												</option>
												<option value="rejected">
													Reject
												</option>
											</select>
										</label>
										<label class="pb-1!">
											<span class="pb-1! text-xs"
												>Notes</span
											>
											<textarea
												{...reviewForm.fields.notes.as(
													"text"
												)}
												class="w-40! text-sm"
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
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
				<th class="border-b border-neutral-200 p-3">Active</th>
				<th class="border-b border-neutral-200 p-3">Elo</th>
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
					<td class="border-b border-neutral-300 p-3">
						{bot.active ? "Yes" : "No"}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{Math.round(bot.elo)}
					</td>
					<td class="border-b border-neutral-300 p-3">
						{bot.wins}-{bot.losses}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

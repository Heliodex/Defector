<script lang="ts">
import Head from "#lib/components/Head.svelte"
import {
	getBattles,
	getBots,
	getHourSubmissions,
	getProjects,
	reviewForm,
} from "./admin.remote"

let projects = $derived(await getProjects())
let bots = $derived(await getBots())
let battles = $derived(await getBattles())
let hourSubmissions = $derived(await getHourSubmissions())
</script>

<Head title="Admin" />

<h1>Admin dashboard</h1>

<h2 class="pt-8 text-2xl">Hour submissions</h2>

{#if hourSubmissions.length === 0}
	<p class="pt-4">No hour submissions yet.</p>
{:else}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="text-left text-neutral-400">
				<th class="border-b border-neutral-600 p-3">Owner</th>
				<th class="border-b border-neutral-600 p-3">Hours</th>
				<th class="border-b border-neutral-600 p-3">Status</th>
				<th class="border-b border-neutral-600 p-3">Submitted</th>
				<th class="border-b border-neutral-600 p-3">Review</th>
			</tr>
		</thead>
		<tbody>
			{#each hourSubmissions as sub (sub.id)}
				<tr class="align-top">
					<td class="border-b border-neutral-700 p-3">
						{sub.ownerEmail ?? "—"}
					</td>
					<td class="border-b border-neutral-700 p-3">
						{sub.hours.toFixed(2)}
					</td>
					<td class="border-b border-neutral-700 p-3">
						<span
							class="font-bold {sub.status === "approved" ? '' : sub.status === "rejected" ? 'text-red-400' : 'text-yellow-400'}"
							>{sub.status}</span
						>
					</td>
					<td
						class="border-b border-neutral-700 p-3 whitespace-nowrap"
					>
						{sub.created}
					</td>
					<td class="border-b border-neutral-700 p-3">
						{#if sub.status === "pending"}
							<div class="flex gap-2">
								<form {...reviewForm}>
									<input
										{...reviewForm.fields.id.as("hidden", sub.id)}
									>
									<input
										{...reviewForm.fields.status.as("hidden", "approved")}
									>
									<button
										class="btn bg-green-600 hover:bg-green-700 px-3 py-1 text-sm"
										type="submit"
									>
										Approve
									</button>
								</form>
								<form {...reviewForm}>
									<input
										{...reviewForm.fields.id.as("hidden", sub.id)}
									>
									<input
										{...reviewForm.fields.status.as("hidden", "rejected")}
									>
									<button
										class="btn bg-red-600 hover:bg-red-700 px-3 py-1 text-sm"
										type="submit"
									>
										Reject
									</button>
								</form>
							</div>
						{:else}
							—
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="pt-10 text-2xl">Bots</h2>

{#if bots.length === 0}
	<p class="pt-4">No bots have been submitted yet.</p>
{:else}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="text-left text-neutral-400">
				<th class="border-b border-neutral-600 p-3">Bot</th>
				<th class="border-b border-neutral-600 p-3">Owner</th>
				<th class="border-b border-neutral-600 p-3">Active</th>
				<th class="border-b border-neutral-600 p-3">Elo</th>
				<th class="border-b border-neutral-600 p-3">W-L</th>
			</tr>
		</thead>
		<tbody>
			{#each bots as bot (bot.id)}
				<tr class="align-top">
					<td class="border-b border-neutral-700 p-3 font-semibold">
						<a href="/bot/{bot.id}">{bot.name}</a>
					</td>
					<td class="border-b border-neutral-700 p-3">
						{bot.ownerEmail ?? "—"}
					</td>
					<td class="border-b border-neutral-700 p-3">
						{bot.active ? "Yes" : "No"}
					</td>
					<td class="border-b border-neutral-700 p-3">
						{Math.round(bot.elo)}
					</td>
					<td class="border-b border-neutral-700 p-3">
						{bot.wins}-{bot.losses}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="pt-10 text-2xl">Recent battles</h2>

{#if battles.length === 0}
	<p class="pt-4">No battles yet.</p>
{:else}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="text-left text-neutral-400">
				<th class="border-b border-neutral-600 p-3">Battle</th>
				<th class="border-b border-neutral-600 p-3">Scores</th>
				<th class="border-b border-neutral-600 p-3">When</th>
			</tr>
		</thead>
		<tbody>
			{#each battles as battle (battle.id)}
				<tr class="align-top">
					<td class="border-b border-neutral-700 p-3">
						<a href="/battle/{battle.id}">
							{battle.bot0}
							vs {battle.bot1}
						</a>
					</td>
					<td class="border-b border-neutral-700 p-3">
						{battle.scores[0]?.toFixed(2)}
						– {battle.scores[1]?.toFixed(2)}
					</td>
					<td
						class="border-b border-neutral-700 p-3 whitespace-nowrap"
					>
						{battle.created}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="pt-10 text-2xl">Submitted projects</h2>

{#if projects.length === 0}
	<p class="pt-4">No projects have been submitted yet.</p>
{:else}
	<div class="relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip">
		<div class="overflow-x-auto px-4 sm:px-6">
			<table class="w-full min-w-250 border-collapse text-sm">
				<thead>
					<tr class="text-left text-neutral-400">
						<th class="border-b border-neutral-600 p-3">Project</th>
						<th class="border-b border-neutral-600 p-3">
							Submitter
						</th>
						<th class="border-b border-neutral-600 p-3">AI used</th>
						<th class="border-b border-neutral-600 p-3">Image</th>
						<th class="border-b border-neutral-600 p-3">
							Lapse timelapse IDs
						</th>
						<th class="border-b border-neutral-600 p-3">
							Code URL
						</th>
						<th class="border-b border-neutral-600 p-3">
							Reviewer notes
						</th>
						<th class="border-b border-neutral-600 p-3">
							Submitted
						</th>
					</tr>
				</thead>
				<tbody>
					{#each projects as project (project.id)}
						<tr class="align-top">
							<td class="border-b border-neutral-700 p-3">
								<h3
									class="text-lg! pb-0! font-semibold text-yellow-300"
								>
									{project.name}
								</h3>
								<p class="pt-1 text-neutral-300">
									{project.description}
								</p>
							</td>

							<td class="border-b border-neutral-700 p-3">
								{project.submitterEmail ?? "—"}
							</td>

							<td class="border-b border-neutral-700 p-3">
								{project.ai ? "Yes" : "No"}
							</td>

							<td class="border-b border-neutral-700 p-3">
								{#if project.image?.hash}
									<img
										src={`/admin/images/${project.image.hash}`}
										alt={`${project.name} project image`}
										class="aspect-video w-48 rounded object-cover"
									>
								{:else}
									—
								{/if}
							</td>

							<td class="border-b border-neutral-700 p-3">
								{#if project.lapseTimelapses?.length}
									<ul class="flex flex-col gap-1">
										{#each project.lapseTimelapses as id}
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

							<td class="border-b border-neutral-700 p-3">
								{#if project.codeUrl}
									<a
										href={project.codeUrl}
										target="_blank"
										rel="noreferrer"
										class="break-all"
										>{project.codeUrl}</a
									>
								{:else}
									—
								{/if}
							</td>

							<td
								class="border-b border-neutral-700 p-3 text-neutral-300"
							>
								{project.reviewerNotes ?? "—"}
							</td>

							<td
								class="border-b border-neutral-700 p-3 whitespace-nowrap text-neutral-400"
							>
								{project.submittedAt}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}

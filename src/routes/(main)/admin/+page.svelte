<script lang="ts">
import Head from "#lib/components/Head.svelte"
import { getProjects } from "./admin.remote"

let projects = $derived(await getProjects())
</script>

<Head title="Admin" />

<h1>All submitted projects</h1>

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

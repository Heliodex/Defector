<script lang="ts">
import type { Snippet } from "svelte"
import type { SubmissionCardSubmission } from "#lib/submission.js"

const {
	sub,
	imageSrc,
	subtitle,
	href,
	middle,
	footer,
}: {
	sub: SubmissionCardSubmission
	imageSrc: string | null
	subtitle: string
	href?: string
	middle?: Snippet
	footer?: Snippet
} = $props()

// "needschanges" is a single word in the database but reads better as two.
const statusLabel = (status: string) =>
	status === "needschanges" ? "needs changes" : status

const statusClasses = (status: string) => {
	switch (status) {
		case "approved":
			return "bg-green-100 text-green-800"
		case "rejected":
			return "bg-red-100 text-red-600"
		case "needschanges":
			return "bg-amber-100 text-amber-800"
	}
	return "bg-blue-100 text-blue-700"
}
</script>

<article class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="text-xl font-semibold wrap-break-word">
				{#if href}
					<a {href} class="hover:underline">{sub.name}</a>
				{:else}
					{sub.name}
				{/if}
			</h3>
			<p class="pt-1 text-sm text-neutral-600">
				{subtitle}
			</p>
		</div>
		<span
			class={["rounded-full px-3 py-1 text-xs font-bold", statusClasses(
				sub.status
			)]}
		>
			{statusLabel(sub.status)}
		</span>
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

	<p class="py-3 whitespace-pre-wrap wrap-break-word">
		{sub.description}
	</p>

	{#if imageSrc}
		<img
			src={imageSrc}
			alt="{sub.name} submission"
			loading="lazy"
			class="w-full max-w-md rounded-lg object-cover"
		>
	{/if}

	<dl class="grid grid-cols-2 gap-x-6 gap-y-4 py-4 text-sm sm:grid-cols-4">
		<div>
			<dt class="text-neutral-600">Links</dt>
			<dd class="font-semibold">
				<a href={sub.codeUrl} target="_blank" rel="noreferrer">
					Code
				</a>
			</dd>
		</div>
		<div>
			<dt class="text-neutral-600">AI</dt>
			<dd class="font-semibold">{sub.ai ? "Yes" : "No"}</dd>
		</div>
		<div>
			<dt class="text-neutral-600">Recommend</dt>
			<dd class="font-semibold">{sub.howLikelyRecommend ?? "—"}/10</dd>
		</div>
		<div>
			<dt class="text-neutral-600">Timelapses</dt>
			<dd class="font-semibold">
				{sub.lapseTimelapses?.length ?? 0}
			</dd>
		</div>
	</dl>

	{@render middle?.()}

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
							>
								{bot.name}
							</a>
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
							>
								{id}
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="pt-1 text-sm text-neutral-500">—</p>
			{/if}
		</div>
	</div>

	{#if footer}
		<div class="pt-6">
			<hr class="pb-4">
			{@render footer()}
		</div>
	{/if}
</article>

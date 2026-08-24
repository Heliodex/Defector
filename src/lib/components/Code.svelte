<script lang="ts">
const { filename, code }: { filename: string; code: string } = $props()

function countTabs(line: string): number {
	return line.split("\t").length - 2
}

const lines = $derived(
	code
		.split("\n")
		.slice(1, -1)
		.map(line => [countTabs(line), line.trim()] as [number, string])
)
</script>

<div class="pt-2 pb-6 bg-neutral-100">
	<div class="w-full px-4 py-2 flex-col border border-neutral-300 rounded-xl">
		<p class="pb-2 font-bold"><u>{filename}</u></p>

		<div>
			{#each lines as [indent, line]}
				{let padding = `padding-left: ${indent + 0.5}rem`}

				{#if line.startsWith("+")}
					<code class="bg-blue-100" style={padding}>
						{line.substring(1)}
					</code>
				{:else if line.startsWith("-")}
					<code class="bg-red-100" style={padding}>
						{line.substring(1)}
					</code>
				{:else}
					<code style={padding}>{line}</code>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
code {
	min-height: 1.5rem;
	display: block;
}
</style>

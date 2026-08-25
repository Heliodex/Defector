<script lang="ts">
import type { Snippet } from "svelte"

const {
	title,
	children,
}: {
	title: string
	children: Snippet
} = $props()
</script>

<details name="details" class="bg-neutral-200 transition-colors rounded-lg">
	<summary class="p-2 px-4 block cursor-pointer">{title}</summary>
	<div class="px-4 py-2 bg-white rounded-b-lg">{@render children()}</div>
</details>

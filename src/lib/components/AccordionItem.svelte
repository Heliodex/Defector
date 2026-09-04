<script lang="ts">
import type { Snippet } from "svelte"

const {
	title,
	children,
	class: class2 = "",
}: {
	title: string
	children: Snippet
	class?: string
} = $props()
</script>

<details name="details" class="bg-neutral-200 transition-colors rounded-lg">
	<summary class="p-2 px-4 block cursor-pointer">{title}</summary>
	<div class={["px-4 py-2 bg-white rounded-b-lg", class2]}>
		{@render children()}
	</div>
</details>

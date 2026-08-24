<script lang="ts">
import { programmeName } from "#lib/assets/config.js"

let {
	title,
	description = "",
	ogImage = "",
}: {
	title?: string
	description?: string
	ogImage?: string
} = $props()
</script>

<svelte:head>
	{#if title}
		<title>{title} - {programmeName}</title>
	{:else}
		<title>{programmeName}</title>
	{/if}

	{#if description}
		<meta name="description" content={description}>
	{/if}
	{#if ogImage}
		<meta property="og:image" content={ogImage}>
	{/if}
</svelte:head>

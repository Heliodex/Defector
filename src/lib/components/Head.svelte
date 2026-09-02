<script lang="ts">
import { programmeName, siteDescription, siteUrl } from "#lib/assets/config.js"
import { page } from "$app/state"

let {
	title,
	description = siteDescription,
	ogImage = `${siteUrl}/Defector.png`,
	ogImageAlt = `${programmeName} – code a bot and battle others, win video game grants!`,
	ogImageWidth = 1480,
	ogImageHeight = 1280,
	type = "website",
	noindex = false,
	schema,
}: {
	/** Page title, rendered as "Title - Defector". Omit on the landing page. */
	title?: string
	/** Meta description (~155 chars). Defaults to the site-wide tagline. */
	description?: string
	/** Absolute URL of the OpenGraph preview image. */
	ogImage?: string
	/** Alt text for the OpenGraph preview image. */
	ogImageAlt?: string
	/** Declared width of the preview image (helps crawlers). */
	ogImageWidth?: number
	/** Declared height of the preview image (helps crawlers). */
	ogImageHeight?: number
	/** OpenGraph type: "website", "article", etc. */
	type?: string
	/** Set for private pages that should not be indexed. */
	noindex?: boolean
	/** JSON-LD structured data object (or array of objects). */
	schema?: Record<string, unknown> | Array<Record<string, unknown>>
} = $props()

const canonical = $derived(
	siteUrl + (page.url.pathname === "/" ? "/" : page.url.pathname)
)

// The closing tag is split so the literal script end-tag never appears in this component's source (which would prematurely end the script block) and so no useless escape sequence is needed.
const jsonLd = $derived(
	schema
		? `<script type="application/ld+json">${JSON.stringify(schema)}</scr` +
				"ipt>"
		: ""
)
</script>

<svelte:head>
	{#if title}
		<title>{title} - {programmeName}</title>
	{:else}
		<title>{programmeName}</title>
	{/if}

	<meta name="description" content={description}>
	<link rel="canonical" href={canonical}>
	<meta
		name="robots"
		content={noindex ? "noindex, nofollow" : "index, follow"}
	>
	<meta name="theme-color" content="#2b6bff">

	<!-- OpenGraph -->
	<meta property="og:site_name" content={programmeName}>
	<meta property="og:type" content={type}>
	<meta property="og:locale" content="en_GB">
	<meta property="og:url" content={canonical}>
	<meta
		property="og:title"
		content={title ? `${title} - ${programmeName}` : programmeName}
	>
	<meta property="og:description" content={description}>
	<meta property="og:image" content={ogImage}>
	<meta property="og:image:secure_url" content={ogImage}>
	<meta property="og:image:width" content={String(ogImageWidth)}>
	<meta property="og:image:height" content={String(ogImageHeight)}>
	<meta property="og:image:alt" content={ogImageAlt}>

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:site" content="@TheHackClubs">
	<meta
		name="twitter:title"
		content={title ? `${title} - ${programmeName}` : programmeName}
	>
	<meta name="twitter:description" content={description}>
	<meta name="twitter:image" content={ogImage}>
	<meta name="twitter:image:alt" content={ogImageAlt}>

	{#if jsonLd}
		{@html jsonLd}
	{/if}
</svelte:head>

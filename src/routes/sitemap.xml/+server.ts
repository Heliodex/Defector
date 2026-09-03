import { siteUrl } from "#lib/assets/config.js"
import type { RequestHandler } from "./$types"

/** Public, indexable pages. Private/auth pages are intentionally excluded. */
const urls: Array<{ loc: string; changefreq: string; priority: string }> = [
	{ loc: "/", changefreq: "daily", priority: "1.0" },
	{ loc: "/leaderboard", changefreq: "always", priority: "0.9" },
	{ loc: "/guide", changefreq: "daily", priority: "0.8" },
	{ loc: "/guide/writing-a-bot", changefreq: "daily", priority: "0.7" },
	{ loc: "/guide/js-for-bots", changefreq: "daily", priority: "0.7" },
]

export const GET: RequestHandler = () => {
	const lastmod = new Date().toISOString().slice(0, 10)

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		u =>
			`	<url>
		<loc>${siteUrl}${u.loc}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${u.changefreq}</changefreq>
		<priority>${u.priority}</priority>
	</url>`
	)
	.join("\n")}
</urlset>
`

	return new Response(body, {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	})
}

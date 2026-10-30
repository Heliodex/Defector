import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

type ExportData = {
	activeBots: number
	allBattles: number
	battles: {
		id: string
		created: string
		scores: [number, number]
		botNames: [string, string]
	}[]
	bots: {
		id: string
		name: string
		meanScore: number
		stats: { wins: number; losses: number; battles: number }
	}[]
	generatedAt: string
	matrix: [[number, number], [number, number]] | null
}

const root = new URL("..", import.meta.url)
const data = JSON.parse(
	readFileSync(new URL("export.json", root), "utf8")
) as ExportData

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>"']/g,
		char =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[char] ?? char
	)

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
]
const shortMonths = months.map(month => month.slice(0, 3))

const dateParts = (iso: string) => {
	const date = new Date(iso)
	return {
		day: date.getUTCDate(),
		month: date.getUTCMonth(),
		year: date.getUTCFullYear(),
		hours: String(date.getUTCHours()).padStart(2, "0"),
		minutes: String(date.getUTCMinutes()).padStart(2, "0"),
	}
}

const formatExported = (iso: string) => {
	const date = dateParts(iso)
	return `${date.day} ${months[date.month]} ${date.year}, ${date.hours}:${date.minutes} UTC`
}

const formatBattleDate = (iso: string) => {
	const date = dateParts(iso)
	return `${date.day} ${shortMonths[date.month]} ${date.year}, ${date.hours}:${date.minutes} UTC`
}

const formatNumber = (value: number) =>
	new Intl.NumberFormat("en-GB").format(value)

const round2 = (value: number) => Math.round(value * 100) / 100

const lexend = readFileSync(new URL("static/Lexend.woff2", root)).toString(
	"base64"
)
const polysans = readFileSync(new URL("static/PolySans.woff2", root)).toString(
	"base64"
)
const favicon = readFileSync(new URL("src/lib/assets/logo.svg", root)).toString(
	"base64"
)

const ladderRows = data.bots
	.map(
		(bot, index) => `<tr>
					<td class="rank">${index + 1}</td>
					<td class="bot">${escapeHtml(bot.name)}</td>
					<td class="avg">${bot.meanScore.toFixed(3)}</td>
					<td>${bot.stats.wins}-${bot.stats.losses}</td>
					<td>${formatNumber(bot.stats.battles)}</td>
				</tr>`
	)
	.join("\n")

const battleRows = data.battles
	.map(battle => {
		const [left, right] = battle.scores
		const winner = left > right ? 0 : right > left ? 1 : null
		const names = battle.botNames.map(escapeHtml)
		const classes = [
			winner === 0 ? "name winner" : "name",
			"score",
			winner === 1 ? "name winner" : "name",
		]

		return `<li class="battle">
					<span class="players">
						<span class="${classes[0]}">${names[0]}</span>
						<span class="${classes[1]}">${round2(left)}<span class="vs">vs</span>${round2(right)}</span>
						<span class="${classes[2]}">${names[1]}</span>${winner === null ? '<span class="tie">Tie</span>' : ""}
					</span>
					<time class="when" datetime="${battle.created}" title="${battle.created}">${formatBattleDate(battle.created)}</time>
				</li>`
	})
	.join("\n")

const matrix = data.matrix
	? `<table class="matrix">
				<caption class="sr-only">Final payoff matrix</caption>
				<thead>
					<tr>
						<th>You →<br>Opponent ↓</th>
						<th>Cooperate</th>
						<th>Defect</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Cooperate</td>
						<td>${data.matrix[0][0]}, ${data.matrix[0][0]}</td>
						<td>${data.matrix[0][1]}, ${data.matrix[1][0]}</td>
					</tr>
					<tr>
						<td>Defect</td>
						<td>${data.matrix[1][0]}, ${data.matrix[0][1]}</td>
						<td>${data.matrix[1][1]}, ${data.matrix[1][1]}</td>
					</tr>
				</tbody>
			</table>`
	: ""

const html = `<!doctype html>
<html lang="en-GB">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="text-scale" content="scale">
		<title>Final leaderboard - Defector</title>
		<meta name="description" content="Final standings for Defector: the top 20 bots and the last 50 battles from Hack Club's Iterated Prisoner's Dilemma tournament.">
		<meta name="robots" content="index, follow">
		<meta name="theme-color" content="#2b6bff">
		<link rel="icon" href="data:image/svg+xml;base64,${favicon}">
		<meta property="og:type" content="website">
		<meta property="og:locale" content="en_GB">
		<meta property="og:title" content="Final leaderboard - Defector">
		<meta property="og:description" content="Final standings for Defector: the top 20 bots and the last 50 battles.">
		<meta property="og:image" content="./Defector.png">
		<style>
			@font-face {
				font-family: Lexend;
				src: url(data:font/woff2;base64,${lexend}) format("woff2");
				font-display: swap;
			}
			@font-face {
				font-family: PolySans;
				src: url(data:font/woff2;base64,${polysans}) format("woff2");
				font-display: swap;
			}

			*,
			*::before,
			*::after {
				box-sizing: border-box;
			}

			html {
				background: #f5f5f5;
			}

			body {
				margin: 0;
				min-height: 100vh;
				display: flex;
				flex-direction: column;
				background: #f5f5f5;
				color: #1a1a1a;
				font-family: Lexend, system-ui, -apple-system, "Segoe UI", sans-serif;
				line-height: 1.5;
			}

			a {
				color: #2563eb;
				text-decoration: underline;
				transition: color 150ms;
			}
			a:hover {
				color: #1d4ed8;
			}
			a:active {
				color: #3b82f6;
			}

			h1,
			h2 {
				margin: 0;
				font-family: PolySans, Lexend, sans-serif;
				font-weight: 1000;
			}
			h1 {
				color: #2563eb;
				font-size: 1.5rem;
				padding-bottom: 1rem;
			}
			h2 {
				font-size: 1.875rem;
				padding-bottom: 1rem;
				text-decoration: underline;
				text-decoration-color: #60a5fa;
				text-decoration-thickness: 3px;
			}
			p {
				margin: 0;
			}

			.mobile-nav {
				padding: 0.75rem 1rem;
			}
			.mobile-nav ul {
				display: flex;
				flex-wrap: wrap;
				gap: 1.25rem;
				margin: 0;
				padding: 0;
				list-style: none;
			}

			.sidebar {
				display: none;
			}

			.shell {
				display: flex;
				flex: 1;
				flex-direction: column;
				min-width: 0;
			}

			main {
				width: 100%;
				max-width: 60rem;
				margin: 0 auto;
				padding: 5rem 1rem;
				flex: 1;
				min-width: 0;
			}

			.navbtn {
				display: block;
				color: #3b82f6;
				font-weight: 700;
				text-decoration: none;
				border-bottom: 2px solid #bfdbfe;
				padding-bottom: 0;
				transition:
					color 150ms,
					border-color 150ms;
			}
			.navbtn:hover {
				color: #2563eb;
				border-color: #2563eb;
			}

			.page-head {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 1rem;
			}
			.badge {
				display: inline-flex;
				align-items: center;
				gap: 0.5rem;
				flex: none;
				border-radius: 9999px;
				padding: 0.25rem 0.75rem;
				background: #2563eb;
				color: #fff;
				font-size: 0.75rem;
				font-weight: 700;
				white-space: nowrap;
			}
			.badge::before {
				content: "";
				width: 0.5rem;
				height: 0.5rem;
				border-radius: 9999px;
				background: #bfdbfe;
			}

			.summary {
				padding: 0.5rem 0;
				color: #525252;
				font-size: 0.875rem;
			}
			.exported {
				color: #737373;
				font-size: 0.75rem;
			}

			.table-wrap {
				overflow-x: auto;
				padding: 0 1rem;
				margin-top: 0.5rem;
			}
			table {
				font-size: 0.875rem;
			}
			.ladder {
				width: 100%;
				border-collapse: collapse;
			}
			.ladder th {
				padding: 0.75rem;
				border-bottom: 1px solid #e5e5e5;
				background: rgb(0 0 0 / 0.1);
				color: #525252;
				font-weight: 400;
				text-align: left;
			}
			.ladder td {
				padding: 0.75rem;
				border-bottom: 1px solid #d4d4d4;
				vertical-align: top;
			}
			.ladder th:first-child,
			.ladder td:first-child {
				background: rgb(0 0 0 / 0.1);
			}
			.ladder .rank {
				font-weight: 600;
			}
			.ladder .bot {
				color: #2563eb;
				font-weight: 600;
			}
			.ladder .avg {
				font-weight: 700;
			}

			.matrix-wrap {
				padding: 1rem 0;
			}
			.matrix {
				border-collapse: separate;
				border-spacing: 0;
				border: 1px solid #a3a3a3;
				border-radius: 0.5rem;
				background: #fff;
				box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.05);
			}
			.matrix th,
			.matrix td {
				padding: 0.5rem 1rem;
				text-align: left;
				white-space: nowrap;
			}
			.matrix thead {
				background: rgb(0 0 0 / 0.1);
			}
			.matrix th {
				font-weight: 400;
			}
			.matrix td:first-child,
			.matrix th:first-child {
				background: rgb(0 0 0 / 0.1);
			}
			.matrix td:first-child {
				font-weight: 700;
			}

			.note {
				padding-top: 0.25rem;
				color: #737373;
				font-size: 0.75rem;
			}
			.battles {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				margin: 0;
				padding: 1rem 0 0;
				list-style: none;
			}
			.battle {
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				justify-content: space-between;
				gap: 0.5rem;
				border: 1px solid #d4d4d4;
				border-radius: 0.5rem;
				background: #fff;
				padding: 0.5rem 1rem;
			}
			.players {
				display: flex;
				flex-wrap: wrap;
				align-items: baseline;
				gap: 0 0.5rem;
			}
			.name {
				font-weight: 600;
			}
			.name.winner {
				color: #16a34a;
				font-weight: 700;
			}
			.score {
				color: #525252;
				white-space: nowrap;
			}
			.vs {
				padding: 0 0.5rem;
			}
			.tie {
				margin-left: 0.5rem;
				border-radius: 0.25rem;
				background: #e4e4e7;
				padding: 0.125rem 0.375rem;
				color: #525252;
				font-size: 0.75rem;
				font-weight: 700;
			}
			.when {
				color: #525252;
				font-size: 0.75rem;
				white-space: nowrap;
			}

			footer {
				background: #e5e5e5;
				padding: 1rem 2rem;
				text-align: center;
			}
			footer p + p {
				padding-top: 1rem;
			}

			.sr-only {
				position: absolute;
				width: 1px;
				height: 1px;
				padding: 0;
				margin: -1px;
				overflow: hidden;
				clip: rect(0, 0, 0, 0);
				white-space: nowrap;
				border: 0;
			}

			@media (min-width: 640px) {
				.mobile-nav {
					display: none;
				}
				.sidebar {
					display: block;
					position: fixed;
					inset: 0 auto 0 0;
					width: 10rem;
					overflow-y: auto;
					border-right: 2px solid #e5e5e5;
					background: #fff;
					z-index: 1;
				}
				.sidebar h1 {
					padding: 1rem;
					font-size: 1.5rem;
				}
				.sidebar nav {
					padding: 0 1rem 1rem;
				}
				.sidebar ul {
					display: flex;
					flex-direction: column;
					gap: 1rem;
					margin: 0;
					padding: 0;
					list-style: none;
				}
				.shell {
					padding-left: 10rem;
				}
				.battle {
					flex-direction: row;
					align-items: center;
				}
			}
		</style>
	</head>
	<body>
		<nav class="mobile-nav" aria-label="Main">
			<ul>
				<li><a class="navbtn" href="./leaderboard.html" aria-current="page">Leaderboard</a></li>
			</ul>
		</nav>

		<aside class="sidebar">
			<h1>Defector</h1>
			<nav aria-label="Main">
				<ul>
					<li><a class="navbtn" href="./leaderboard.html" aria-current="page">Leaderboard</a></li>
				</ul>
			</nav>
		</aside>

		<div class="shell">
			<main>
				<div class="page-head">
					<h1>Final leaderboard</h1>
					<span class="badge">Event ended</span>
				</div>

				<p class="summary">Top ${data.bots.length} of ${formatNumber(data.activeBots)} bots · ${formatNumber(data.allBattles)} battles fought</p>
				<p class="exported">Final standings exported <time datetime="${data.generatedAt}">${formatExported(data.generatedAt)}</time></p>

				<div class="table-wrap">
					<table class="ladder">
						<caption class="sr-only">Final top ${data.bots.length} leaderboard</caption>
						<thead>
							<tr>
								<th scope="col">#</th>
								<th scope="col">Bot</th>
								<th scope="col">Avg score</th>
								<th scope="col">W-L</th>
								<th scope="col">Battles</th>
							</tr>
						</thead>
						<tbody>
							${ladderRows}
						</tbody>
					</table>
				</div>

				${matrix ? `<h2 class="matrix-heading">Final score matrix</h2>\n\t\t\t\t<div class="matrix-wrap">\n\t\t\t\t${matrix}\n\t\t\t\t</div>` : ""}

				<h2>Recent battles</h2>
				<p class="note">The final ${data.battles.length} battles, newest first. Times are UTC.</p>
				<ul class="battles">
					${battleRows}
				</ul>
			</main>

			<footer>
				<p>A programme by <a href="https://hackclub.enterprise.slack.com/team/U07JH9LU1NC" target="_blank" rel="noreferrer">@Heliodex</a> at <a href="https://hackclub.com/" target="_blank" rel="noreferrer">Hack Club</a>!</p>
				<p><a href="https://hackclub.com/privacy-and-terms" target="_blank" rel="noreferrer">Privacy &amp; Terms</a> | <a href="https://forms.hackclub.com/bounty" target="_blank" rel="noreferrer">Fulfilment bounty</a> | <a href="https://github.com/Heliodex/Defector" target="_blank" rel="noreferrer">Source code</a></p>
			</footer>
		</div>
	</body>
</html>
`

mkdirSync(new URL("static", root), { recursive: true })
writeFileSync(new URL("leaderboard.html", root), html)
console.log("Wrote leaderboard.html")

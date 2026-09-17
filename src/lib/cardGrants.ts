// Grant card CSV generation for the admin panel.
//
// A submission's grant is based on the admin-recorded hours (`review.hoursSpent`)
// and the submission's overall leaderboard multiplier, paid at $4/hr per 1x.

/** Dollars paid per hour at a 1x multiplier. */
export const GRANT_RATE_PER_HOUR = 4

const PURPOSE = "Defector – Video game grant"
const INSTRUCTIONS =
	"Please use to purchase a video game, online game, products/DLC for a game, or credits/currency for an game."
const INVITE_MESSAGE = "Thanks for participating in Defector!"

/** Minimum shape the CSV builder needs from an admin submission. */
export type CardGrantSubmission = {
	id: string
	name: string
	status: string
	ownerEmail: string | null
	leaderboard?: { multiplier: number } | null
	review?: { hoursSpent?: number | null } | null
}

export type CardGrantRow = {
	name: string
	email: string
	hours: number
	multiplier: number
	cents: number
}

export type CardGrantSummary = {
	/** The full CSV contents, including the header row. */
	csv: string
	rows: CardGrantRow[]
	/** Processing submissions left out because they had no email or no hours. */
	skipped: { name: string; reason: string }[]
	totalCents: number
}

/**
 * Renders one CSV field. Values containing a comma, quote or newline are wrapped
 * in quotes (with internal quotes doubled); empty values are written as "" to
 * match the template's blank lock columns.
 */
function field(value: string | number): string {
	const s = String(value)
	if (s === "") return '""'
	if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`
	return s
}

/**
 * Builds the grant card CSV from all admin submissions, keeping only those
 * whose status is "processing". Processing submissions with no email on file or
 * no recorded hours are skipped (and reported) rather than granted 0.
 */
export function buildCardGrants(
	submissions: CardGrantSubmission[]
): CardGrantSummary {
	const header = [
		"email",
		"amount_cents",
		"purpose",
		"instructions",
		"one_time_use",
		"pre_authorization_required",
		"invite_message",
		"merchant_lock",
		"category_lock",
		"keyword_lock",
		"banned_merchants",
		"banned_categories",
	]

	const rows: CardGrantRow[] = []
	const skipped: CardGrantSummary["skipped"] = []

	for (const sub of submissions) {
		if (sub.status !== "processing") continue

		if (!sub.ownerEmail) {
			skipped.push({ name: sub.name, reason: "No email on file" })
			continue
		}

		const hours = sub.review?.hoursSpent ?? 0
		if (!(hours > 0)) {
			skipped.push({ name: sub.name, reason: "No hours spent recorded" })
			continue
		}

		const multiplier = sub.leaderboard?.multiplier ?? 1
		const cents = Math.round(hours * multiplier * GRANT_RATE_PER_HOUR * 100)

		rows.push({
			name: sub.name,
			email: sub.ownerEmail,
			hours,
			multiplier,
			cents,
		})
	}

	const lines = [header.map(field).join(",")]
	for (const row of rows) {
		lines.push(
			[
				row.email,
				row.cents,
				PURPOSE,
				INSTRUCTIONS,
				"false",
				"false",
				INVITE_MESSAGE,
				"",
				"",
				"",
				"",
				"",
			]
				.map(field)
				.join(",")
		)
	}

	return {
		csv: `${lines.join("\n")}\n`,
		rows,
		skipped,
		totalCents: rows.reduce((sum, row) => sum + row.cents, 0),
	}
}

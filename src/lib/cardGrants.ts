// Grant card CSV generation for the admin panel.
//
// A submission's grant is based on the admin-recorded hours (`review.hoursSpent`)
// and the submission's overall leaderboard multiplier, paid at $4/hr per 1x.
// Recipients with several processing submissions get a single card whose value
// is the sum of all of them.

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
	email: string
	/** Names of the submissions rolled into this recipient's card. */
	names: string[]
	hours: number
	cents: number
}

export type CardGrantSummary = {
	/** The full CSV contents, including the header row. */
	csv: string
	/** One row per recipient. */
	rows: CardGrantRow[]
	/** Processing submissions left out because they had no email or no hours. */
	skipped: { name: string; reason: string }[]
	/** Number of submissions rolled into `rows`. */
	submissionCount: number
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
 * no recorded hours are skipped (and reported) rather than granted 0. All of a
 * recipient's processing submissions are combined into a single card.
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

	const rowsByEmail = new Map<string, CardGrantRow>()
	const skipped: CardGrantSummary["skipped"] = []
	let submissionCount = 0

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

		// One card per recipient: add this submission's value to theirs.
		const existing = rowsByEmail.get(sub.ownerEmail)
		if (existing) {
			existing.names.push(sub.name)
			existing.hours += hours
			existing.cents += cents
		} else {
			rowsByEmail.set(sub.ownerEmail, {
				email: sub.ownerEmail,
				names: [sub.name],
				hours,
				cents,
			})
		}
		submissionCount++
	}

	const rows = [...rowsByEmail.values()]
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
		submissionCount,
		totalCents: rows.reduce((sum, row) => sum + row.cents, 0),
	}
}

export type SubmissionCardBot = {
	id: string
	name: string
	rank: number | null
	multiplier: number
}

export type SubmissionCardSubmission = {
	id: string
	name: string
	created: string
	description: string
	codeUrl: string
	ai: boolean
	image?: { hash: string; updated: string } | undefined
	status: string
	lapseTimelapses: string[]
	bots: SubmissionCardBot[]
	leaderboard?: {
		rankedCount: number
		bestRank: number | null
		multiplier: number
	} | null
	howLikelyRecommend?: number | null
	review?: { notes?: string | null; privateNotes?: string | null } | null
}

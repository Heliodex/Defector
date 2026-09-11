# Update a submission the admin asked the user to change. Only the editable fields are merged; timelapses, bots and the leaderboard snapshot stay locked. The update is scoped to the calling user's own submissions and only succeeds while the status is still "needschanges", so a stale edit can't overwrite a submission that has since been reviewed. Resubmitting puts it back in the review queue (the previous review notes are kept so the reviewer retains context).
UPDATE $id MERGE {
	name: $name,
	description: $description,
	codeUrl: $codeUrl,
	ai: $ai,
	howHear: $howHear,
	howDoingWell: $howDoingWell,
	howImprove: $howImprove,
	howLikelyRecommend: $howLikelyRecommend,
	image: $image,
	status: "pending"
} WHERE status = "needschanges"
	AND $id IN (SELECT VALUE id FROM $user->submittedHours->hourSubmission);

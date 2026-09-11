# Update a submission that is still open for editing: either one the admin asked the user to change ("needschanges") or one still awaiting its first review ("pending"). Only the editable fields are merged; timelapses, bots and the leaderboard snapshot stay locked. The update is scoped to the calling user's own submissions and only succeeds while the status is still open, so a stale edit can't overwrite a submission that has since been reviewed. Saving puts it back in the review queue (the previous review notes are kept so the reviewer retains context).
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
} WHERE status IN ["pending", "needschanges"]
	AND $id IN (SELECT VALUE id FROM $user->submittedHours->hourSubmission);

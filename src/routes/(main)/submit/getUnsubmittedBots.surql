# Lists the calling user's bots which haven't been submitted in any of their hour submissions yet.
# Archived bots are excluded - only active/inactive ones can be submitted for hours.
# Also returns the live bonus rank + reward multiplier preview (same ordering as leaderboardBots.surql,
# but with a stricter >= 30 battle minimum for bonus eligibility instead of the page's >= 10);
# the authoritative rank/multiplier is snapshotted atomically in createHourSubmission.surql at submit time.
LET $submitted = array::flatten((SELECT VALUE bots FROM $user->submittedHours->hourSubmission WHERE bots != NONE) ?? []);
LET $ladder = (SELECT id, meanScore, name FROM bot
	WHERE (battles ?? 0) >= 30 AND active = "active"
	ORDER BY meanScore DESC, name ASC);
LET $ladderIds = $ladder.map(|$b| $b.id);
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	meanScore,
	fn::botLadderRank(id, $ladderIds) AS rank,
	fn::hourMultiplier(fn::botLadderRank(id, $ladderIds)) AS multiplier
FROM $user->created->bot
WHERE id NOT IN $submitted
ORDER BY created DESC;

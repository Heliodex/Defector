# Lists the calling user's bots which haven't been submitted in any of their hour submissions yet.
# Archived bots are excluded - only active/inactive ones can be submitted for hours.
# Also returns the live ladder rank + reward multiplier preview (same ladder definition as leaderboardBots.surql);
# the authoritative rank/multiplier is snapshotted atomically in createHourSubmission.surql at submit time.
LET $submitted = array::flatten((SELECT VALUE bots FROM $user->submittedHours->hourSubmission WHERE bots != NONE) ?? []);
LET $ladder = (SELECT id, meanScore, name FROM bot
	WHERE (battles ?? 0) >= 10 AND active = "active"
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

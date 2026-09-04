# Snapshot the leaderboard position of the SELECTED bots ($bots) at submission time.
# Uses the same ladder definition as leaderboardBots.surql (active + >= 10 battles, ORDER BY meanScore DESC, name ASC) so the stored rank matches what the leaderboard page shows. Inactive / <10-battle bots are naturally unranked (NONE → 1x).
LET $ladder = (SELECT id, meanScore, name FROM bot WHERE (battles ?? 0) >= 10 AND active = "active" ORDER BY meanScore DESC, name ASC);
LET $ladderIds = $ladder.map(|$b| $b.id);
LET $matrix = fn::latestMatrix();
LET $now = time::now();
LET $selected = (SELECT id, name, meanScore FROM bot WHERE id IN $bots);
LET $snapBots = $selected.map(|$b| fn::hourBotEntry($b, $ladderIds));
LET $ranks = $snapBots.filter(|$b| $b.rank != NONE).map(|$b| $b.rank);
LET $bestRank = IF array::len($ranks) == 0 { NONE } ELSE { math::min($ranks) };

LET $hourSubmission = CREATE ONLY hourSubmission CONTENT {
	image: $image,
	name: $name,
	description: $description,
	codeUrl: $codeUrl,
	ai: $ai,
	howHear: $howHear,
	howDoingWell: $howDoingWell,
	howImprove: $howImprove,
	howLikelyRecommend: $howLikelyRecommend,
	lapseTimelapses: $timelapseIds,
	bots: $bots,
	leaderboard: {
		matrix: $matrix,
		capturedAt: $now,
		rankedCount: array::len($ladder),
		bestRank: $bestRank,
		multiplier: fn::hourMultiplier($bestRank),
		bots: $snapBots
	}
} RETURN VALUE id;

$hourSubmission;

RELATE $user->submittedHours->$hourSubmission;

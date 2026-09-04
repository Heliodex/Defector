# Snapshot the leaderboard position of the SELECTED bots ($bots) at submission time.
# Bonus rewards need >= 30 battles (stricter than the leaderboard page's >= 10 in leaderboardBots.surql),
# but otherwise the ladder matches the page (active bots, ORDER BY meanScore DESC, name ASC). Inactive / <30-battle bots are naturally unranked (NONE → 1x).
LET $ladder = (SELECT id, meanScore, name FROM bot WHERE (battles ?? 0) >= 30 AND active = "active" ORDER BY meanScore DESC, name ASC);
LET $ladderIds = $ladder.map(|$b| $b.id);
LET $matrix = fn::latestMatrix();
LET $now = time::now();
LET $selected = (SELECT id, name, meanScore FROM bot WHERE id IN $bots);
LET $snapBots = $selected.map(|$b| fn::hourBotEntry($b, $ladderIds));
LET $ranks = $snapBots.filter(|$b| $b.rank != NONE).map(|$b| $b.rank);
LET $bestRank = IF array::len($ranks) == 0 { NONE } ELSE { math::min($ranks) };
# Mean of the selected bots' multipliers (unranked bots contribute 1x): bundling weak bots dilutes the reward.
LET $meanMultiplier = IF array::len($snapBots) == 0 { 1.0 } ELSE { math::sum($snapBots.map(|$b| $b.multiplier)) / <float> array::len($snapBots) };

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
		multiplier: $meanMultiplier,
		bots: $snapBots
	}
} RETURN VALUE id;

$hourSubmission;

RELATE $user->submittedHours->$hourSubmission;

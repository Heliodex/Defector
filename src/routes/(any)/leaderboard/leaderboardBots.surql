# One pass over ALL battles, then group per bot.
# Stats (wins/losses/battles) are all-time, but the mean score is scoped to the CURRENT matrix: because every battle records the matrix it was played on, pushing a new matrix resets each bot's average to the games on the new matrix.

LET $current = fn::latestMatrix();

LET $rows = (SELECT botIds, scores, matrix = $current AS current FROM battle)
	.map(|$b| [
		{
			bot: $b.botIds[0],
			score: $b.scores[0],
			current: $b.current,
			won: fn::b2i($b.scores[0] > $b.scores[1]),
			lost: fn::b2i($b.scores[0] < $b.scores[1]),
		},
		{
			bot: $b.botIds[1],
			score: $b.scores[1],
			current: $b.current,
			won: fn::b2i($b.scores[1] > $b.scores[0]),
			lost: fn::b2i($b.scores[1] < $b.scores[0]),
		},
	]).flatten();

# All-time win/loss/battle totals (every battle, any matrix).
LET $stats = (SELECT
		bot,
		count() AS battles,
		math::sum(won) AS wins,
		math::sum(lost) AS losses
	FROM $rows
	GROUP BY bot);

# Mean of the bot's own per-battle scores, over current-matrix battles only. math::mean gives 0 default below when a bot has no current-matrix battles.
LET $scores = (SELECT
		bot,
		math::mean(score) AS meanScore
	FROM $rows
	WHERE current
	GROUP BY bot);

LET $bots = (SELECT id, name FROM bot);

# Merge the aggregates into the bot rows: bots with no battles get zeroed stats and a 0 mean score; bots that haven't battled on the current matrix keep their all-time stats but show a 0 mean score until they play again.
SELECT * FROM $bots.map(|$b| {
	LET $id = record::id($b.id);
	LET $s = $stats.find(|$x| $x.bot == $id)
		OR { battles: 0, wins: 0, losses: 0 };
	LET $m = $scores.find(|$x| $x.bot == $id);
	{
		id: $id,
		name: $b.name,
		meanScore: $m.meanScore ?? 0.0,
		stats: {
			wins: $s.wins,
			losses: $s.losses,
			battles: $s.battles,
		},
	}
}) ORDER BY meanScore DESC, name ASC LIMIT 20;

count(SELECT 1 FROM bot WHERE active);

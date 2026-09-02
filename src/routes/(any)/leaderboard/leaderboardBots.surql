# One pass over ALL battles, then group per bot.
# The old version called fn::botElo + fn::botStats per bot, each doing its own indexed scan over that bot's battles (~2 scans x battles-per-bot x bot count).
# Every battle has exactly 2 bots, so we can flatten it into per-bot rows and aggregate everything in a single table scan instead.

LET $rows = (SELECT botIds, scores FROM battle)
	.map(|$b| [
		{
			bot: $b.botIds[0],
			score: $b.scores[0],
			won: fn::b2i($b.scores[0] > $b.scores[1]),
			lost: fn::b2i($b.scores[0] < $b.scores[1]),
		},
		{
			bot: $b.botIds[1],
			score: $b.scores[1],
			won: fn::b2i($b.scores[1] > $b.scores[0]),
			lost: fn::b2i($b.scores[1] < $b.scores[0]),
		},
	]).flatten();

LET $agg = (SELECT
		bot,
		math::sum(score) AS scoreSum,
		count() AS battles,
		math::sum(won) AS wins,
		math::sum(lost) AS losses
	FROM $rows
	GROUP BY bot);

LET $bots = (SELECT id, name FROM bot);

# Merge the aggregates into the bot rows (bots with no battles default to a mean score of 0 / zeroed stats, matching the old fn::botElo / fn::botStats behaviour).
SELECT * FROM $bots.map(|$b| {
	LET $a = $agg.find(|$x| $x.bot == record::id($b.id));
	{
		id: record::id($b.id),
		name: $b.name,
		meanScore: ($a.scoreSum ?? 0.0) / ($a.battles ?? 1),
		stats: {
			wins: $a.wins ?? 0,
			losses: $a.losses ?? 0,
			battles: $a.battles ?? 0,
		},
	}
}) ORDER BY meanScore DESC, name ASC LIMIT 20;

count(SELECT 1 FROM bot WHERE active);

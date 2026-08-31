# One pass over ALL battles, then group per bot.
# The old version called fn::botElo + fn::botStats per bot, each doing its own indexed scan over that bot's battles (~2 scans x battles-per-bot x bot count).
# Every battle has exactly 2 bots, so we can flatten it into per-bot rows and aggregate everything in a single table scan instead.

LET $rows = (SELECT botIds, eloDelta, scores FROM battle)
	.map(|$b| [
		{
			bot: $b.botIds[0],
			delta: $b.eloDelta[0],
			won: fn::b2i($b.scores[0] > $b.scores[1]),
			lost: fn::b2i($b.scores[0] < $b.scores[1]),
		},
		{
			bot: $b.botIds[1],
			delta: $b.eloDelta[1],
			won: fn::b2i($b.scores[1] > $b.scores[0]),
			lost: fn::b2i($b.scores[1] < $b.scores[0]),
		},
	]).flatten();

LET $agg = (SELECT
		bot,
		1000.0 + math::sum(delta) AS elo,
		count() AS battles,
		math::sum(won) AS wins,
		math::sum(lost) AS losses
	FROM $rows
	GROUP BY bot);

LET $bots = (SELECT id, name FROM bot);

# Merge the aggregates into the bot rows (bots with no battles default to elo 1000 / zeroed stats, matching the old fn::botElo / fn::botStats behaviour).
SELECT * FROM $bots.map(|$b| {
	LET $a = $agg.find(|$x| $x.bot == record::id($b.id));
	{
		id: record::id($b.id),
		name: $b.name,
		elo: $a.elo,
		stats: {
			wins: $a.wins,
			losses: $a.losses,
			battles: $a.battles,
		},
	}
}) ORDER BY elo DESC, name ASC LIMIT 20;

count(SELECT 1 FROM bot WHERE active);

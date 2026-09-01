IF count(SELECT 1 FROM bot WHERE active) <= 1 {
	THROW "Not enough bots to play";
};

# Weighted random selection: bots with fewer battles get picked more often. Uses the inverse-transform sampling trick: each bot draws rand()^(1/w) and the highest draw wins, which makes each bot's selection probability proportional to its weight w.
#
# w = 1 / (battles + 1), floored at 0.02 so long-lived battle-hardened bots still get some play instead of starving forever.
#
# (SurrealDB's WASM engine — used in the tests — only allows ORDER BY on a projected field, hence the projected `score` column; callers ignore it.)
#
# Battle counts are computed in one pass over the battle table instead of a correlated count subquery per bot: bots are flattened out of each battle via its two botIds array slots and aggregated with GROUP BY, reusing the battleBotIds index. This is exactly the two-indexed-scan trick from listBots.surql (N correlated count subqueries before, ~2 scans now).
LET $ids = (SELECT VALUE record::id(id) FROM bot WHERE active);

LET $battleCounts = (SELECT
		botId,
		math::sum(battles) AS battles
	FROM (
		(SELECT botIds[0] AS botId, count() AS battles
			FROM battle WHERE botIds CONTAINSANY $ids GROUP BY botIds[0])
		+
		(SELECT botIds[1] AS botId, count() AS battles
			FROM battle WHERE botIds CONTAINSANY $ids GROUP BY botIds[1])
	)
	GROUP BY botId);

# Battles fought so far (0 if never battled); looked up per bot from $battleCounts via a correlated subquery on the in-memory array (no battle-table scan per bot).
LET $bots = (SELECT
	id, codeHash, latestCode, name,
	math::max([
		1.0 / ((SELECT VALUE battles FROM $battleCounts WHERE botId == record::id($parent.id))[0] ?? 0 + 1),
		0.02
	]) AS w
	FROM bot WHERE active);

LET $bot1 = (SELECT id, codeHash, latestCode, name,
	math::pow(rand(), 1.0 / w) AS score FROM $bots
	ORDER BY score DESC LIMIT 1)[0];

LET $bot2 = (SELECT id, codeHash, latestCode, name,
	math::pow(rand(), 1.0 / w) AS score FROM $bots
	WHERE id != $bot1.id
	ORDER BY score DESC LIMIT 1)[0];

[$bot1, $bot2];

IF count(SELECT 1 FROM bot WHERE active) <= 1 {
	THROW "Not enough bots to play";
};

# Weighted random selection: bots with fewer battles get picked more often. Uses the inverse-transform sampling trick: each bot draws rand()^(1/w) and the highest draw wins, which makes each bot's selection probability proportional to its weight w.
#
# w = 1 / (battles + 1), floored at 0.02 so long-lived battle-hardened bots still get some play instead of starving forever.
#
# (SurrealDB's WASM engine — used in the tests — only allows ORDER BY on a projected field, hence the projected `score` column; callers ignore it.)
LET $bots = (SELECT
	id, codeHash, latestCode, name,
	# Battles fought so far (0 if never battled); the subquery uses the battleBotIds index (botIds holds record::id strings).
	math::max([
		1.0 / (((SELECT count() FROM battle WHERE record::id($parent.id) IN botIds GROUP ALL)[0].count ?? 0) + 1),
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

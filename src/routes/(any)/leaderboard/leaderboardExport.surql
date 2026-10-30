# One-shot read-only export of everything the public leaderboard page shows.
#
# Run this against the main database BEFORE pruning anything (the recent-battles
# feed reads the battle table). For example:
#
#   surreal sql --endpoint "$SURREAL_URL" --namespace main --database main \
#     --username root --password root --json --multi < leaderboardExport.surql
#
# The output is a single JSON line wrapping one object: [{ "generatedAt": ... }].
# Copy that whole line back and it can be turned into a static HTML page.
#
# It uses the cached aggregates on each bot record, so the only battle-table
# work is the one-off all-time count and the index walk for the 50 newest rows.

RETURN {
	generatedAt: time::now(),

	activeBots: (SELECT count() FROM bot WHERE active = "active" GROUP ALL)[0].count ?? 0,
	allBattles: (SELECT count() FROM battle GROUP ALL)[0].count ?? 0,

	# Latest payoff matrix, [[R, S], [T, P]] where 0 = cooperate and 1 = defect.
	matrix: (SELECT VALUE payoff FROM fn::latestMatrix())[0] ?? null,

	# The same top 20 as the live leaderboard: active bots with at least 10
	# battles, ranked by their mean score on the current matrix.
	bots: (SELECT
			record::id(id) AS id,
			name,
			meanScore,
			fn::botStats(id) AS stats
		FROM bot
		WHERE (battles ?? 0) >= 10 AND active = "active"
		ORDER BY meanScore DESC, name ASC
		LIMIT 20),

	# The same 50 recent battles as the live leaderboard, newest first.
	battles: (SELECT
			record::id(id) AS id,
			created,
			scores,
			fn::battleBotNames($this.id) AS botNames
		FROM battle
		ORDER BY created DESC
		LIMIT 50)
};

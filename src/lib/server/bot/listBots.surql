# Lists the current user's bots together with their live ladder stats.
# Everything is read from the aggregates cached on each bot record and kept current by the battle/matrix events in init.surql - no battle-table scans.
# meanScore only covers battles on the CURRENT matrix (pushing a new matrix resets it); wins/losses/battles stay all-time.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	meanScore,
	fn::botStats(id) AS stats
FROM $user->created->bot
ORDER BY created DESC;

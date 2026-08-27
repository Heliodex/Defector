# Lists the current user's bots, together with their live ladder stats.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	fn::botElo() AS elo,
	fn::botWins() AS wins,
	fn::botLosses() AS losses,
	fn::botTotalBattles() AS totalBattles
FROM $user->created->bot
ORDER BY created DESC;

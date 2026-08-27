# Lists the current user's bots, together with their live ladder stats.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	fn::botElo($this) AS elo,
	fn::botWins($this) AS wins,
	fn::botLosses($this) AS losses,
	fn::botTotalBattles($this) AS totalBattles
FROM $user->created->bot
ORDER BY created DESC;

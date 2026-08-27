# Lists the current user's bots, together with their live ladder stats.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	fn::botElo($this.id) AS elo,
	fn::botWins($this.id) AS wins,
	fn::botLosses($this.id) AS losses,
	fn::botTotalBattles($this.id) AS totalBattles
FROM $user->created->bot
ORDER BY created DESC;

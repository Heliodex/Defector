# Lists the current user's bots, together with their live ladder stats.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	fn::botElo($this.id) AS elo,
	fn::botStats($this.id) AS stats
FROM $user->created->bot
ORDER BY created DESC;

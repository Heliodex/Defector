# Lists the current user's bots, together with their live ladder stats.
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	elo,
	wins,
	losses,
	totalBattles
FROM $user->created->bot
ORDER BY created DESC;

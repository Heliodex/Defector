# Lists the current user's archived bots together with their live ladder stats.
# (The archived bots page; My Bots only shows active/inactive ones.)
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created,
	meanScore,
	fn::botStats(id) AS stats
FROM $user->created->bot
WHERE active = "archived"
ORDER BY created DESC;

SELECT
	record::id(id) AS id,
	created,
	IF bots[0] = $bot { eloDelta[0] } ELSE { eloDelta[1] } AS delta,
	IF bots[0] = $bot { scores[0] } ELSE { scores[1] } AS score
FROM battle
WHERE $bot IN bots
ORDER BY created DESC
LIMIT 200;

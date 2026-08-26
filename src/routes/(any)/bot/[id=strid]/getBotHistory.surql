SELECT
	record::id(id) AS id,
	created,
	eloDelta[array::find_index(bots, $bot)] AS delta,
	scores[array::find_index(bots, $bot)] AS score
FROM battle
WHERE $bot IN bots
ORDER BY created DESC
LIMIT 200;

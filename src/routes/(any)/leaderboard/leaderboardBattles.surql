SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	$parent.bots.map(|$b| SELECT VALUE name FROM ONLY $b) AS botNames,
	[record::id($parent.bots[0]), record::id($parent.bots[1])] AS botIds
FROM battle
ORDER BY created DESC
LIMIT 50;

count(SELECT 1 FROM battle);

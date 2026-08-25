SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	(SELECT VALUE name FROM ONLY $parent.bots[0])[0] AS bot0,
	(SELECT VALUE name FROM ONLY $parent.bots[1])[0] AS bot1,
	[record::id($parent.bots[0]), record::id($parent.bots[1])] AS botIds
FROM battle
ORDER BY created DESC
LIMIT 50;

count(SELECT 1 FROM battle);

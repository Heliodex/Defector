SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	(SELECT VALUE name FROM ONLY $parent.bots[0])[0] AS bot0,
	(SELECT VALUE name FROM ONLY $parent.bots[1])[0] AS bot1,
	[record::id($parent.bots[0]) ?? NONE, record::id($parent.bots[1]) ?? NONE] AS botIds
FROM battle
ORDER BY created DESC
LIMIT 50;
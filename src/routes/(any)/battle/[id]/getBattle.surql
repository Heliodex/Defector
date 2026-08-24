SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	rounds,
	botNames: [
		(SELECT VALUE name FROM ONLY $parent.bots[0])[0],
		(SELECT VALUE name FROM ONLY $parent.bots[1])[0]
	],
	botIds: [
		(SELECT VALUE record::id($parent.bots[0]))[0],
		(SELECT VALUE record::id($parent.bots[1]))[0]
	]
FROM ONLY $battle;

SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	rounds,
	$parent.bots.map(|$bot| SELECT VALUE name FROM ONLY $bot) AS botNames,
	$parent.bots.map(|$bot| record::id($bot)) AS botIds
FROM ONLY $battle;

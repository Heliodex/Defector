SELECT
	record::id(id) AS id,
	created,
	scores,
	errors,
	rounds,
	fn::botNames($parent.id) AS botNames,
	$parent.bots.map(|$bot| record::id($bot)) AS botIds
FROM ONLY $battle;

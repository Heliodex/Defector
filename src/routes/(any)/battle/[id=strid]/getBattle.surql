SELECT
	record::id(id) AS id,
	created,
	scores,
	eloDelta,
	errors,
	rounds,
	bots,
    fn::battleBotNames(id) AS botNames,
    bots.map(|$bot| record::id($bot)) AS botIds
FROM ONLY $battle

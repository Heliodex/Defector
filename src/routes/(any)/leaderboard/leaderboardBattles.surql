SELECT
	record::id(id) AS id,
	created,
	fn::battleBotNames($parent.id) AS botNames,
	[record::id($parent.bots[0]), record::id($parent.bots[1])] AS botIds
FROM battle
WHERE IF $id { id == $id } ELSE { true }
ORDER BY created DESC
LIMIT 50;

count(SELECT 1 FROM battle);

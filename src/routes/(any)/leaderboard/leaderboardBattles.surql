SELECT
	record::id(id) AS id,
	created,
	fn::battleBotNames($parent.id) AS botNames,
	[record::id($parent.bots[0]), record::id($parent.bots[1])] AS botIds
FROM battle
ORDER BY created DESC
LIMIT 50;

count(SELECT 1 FROM battle);

LIVE SELECT
	record::id(id) AS id,
	created,
	fn::battleBotNames($parent.id) AS botNames,
	[record::id($parent.bots[0]), record::id($parent.bots[1])] AS botIds,
	count(SELECT 1 FROM battle) AS allBattles
FROM battle;

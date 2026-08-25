SELECT
	record::id(id) AS id,
	name,
	elo,
	wins,
	losses,
	totalBattles,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName
FROM bot
WHERE active = true
ORDER BY elo DESC, wins DESC, name ASC;

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

count(SELECT 1 FROM bot);
count(SELECT 1 FROM battle);

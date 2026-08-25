LIVE SELECT
	record::id(id) AS id,
	name,
	elo,
	wins,
	losses,
	totalBattles,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName,
	count(SELECT 1 FROM bot) AS activeBots
FROM bot
WHERE active = true;

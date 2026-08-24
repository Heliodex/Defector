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

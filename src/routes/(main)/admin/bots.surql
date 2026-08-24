SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	elo,
	wins,
	losses,
	totalBattles,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY elo DESC, name ASC;

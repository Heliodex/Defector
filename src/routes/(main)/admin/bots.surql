SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	fn::botElo() AS elo,
	fn::botWins() AS wins,
	fn::botLosses() AS losses,
	fn::botTotalBattles() AS totalBattles,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY elo DESC, name ASC;

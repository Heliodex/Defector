SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	fn::botElo($this) AS elo,
	fn::botWins($this) AS wins,
	fn::botLosses($this) AS losses,
	fn::botTotalBattles($this) AS totalBattles,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY elo DESC, name ASC;

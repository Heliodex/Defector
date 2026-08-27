SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	fn::botElo($this.id) AS elo,
	fn::botWins($this.id) AS wins,
	fn::botLosses($this.id) AS losses,
	fn::botTotalBattles($this.id) AS totalBattles,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY elo DESC, name ASC;

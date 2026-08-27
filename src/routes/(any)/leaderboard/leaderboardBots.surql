SELECT
	record::id(id) AS id,
	name,
	fn::botElo($this.id) AS elo,
	fn::botWins($this.id) AS wins,
	fn::botLosses($this.id) AS losses,
	fn::botTotalBattles($this.id) AS totalBattles,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName
FROM bot
WHERE active = true AND IF $id { id == $id } ELSE { true }
ORDER BY elo DESC, wins DESC, name ASC;

count(SELECT 1 FROM bot);

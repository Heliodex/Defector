SELECT
	record::id(id) AS id,
	name,
	fn::botElo() AS elo,
	fn::botWins() AS wins,
	fn::botLosses() AS losses,
	fn::botTotalBattles() AS totalBattles,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName
FROM bot
WHERE active = true
ORDER BY elo DESC, wins DESC, name ASC;

count(SELECT 1 FROM bot);

LIVE SELECT
	record::id(id) AS id,
	name,
	fn::botElo() AS elo,
	fn::botWins() AS wins,
	fn::botLosses() AS losses,
	fn::botTotalBattles() AS totalBattles,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName,
	count(SELECT 1 FROM bot) AS activeBots
FROM bot
WHERE active = true;

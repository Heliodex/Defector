SELECT
	record::id(id) AS id,
	name,
	fn::botElo($this.id) AS elo,
	fn::botStats($this.id) AS stats
	-- SELECT VALUE extraInfo.nickname FROM ONLY $parent<-created<-user AS ownerName
FROM bot
WHERE IF $id { id == $id } ELSE { true }
ORDER BY elo DESC, name ASC;

count(SELECT 1 FROM bot WHERE active);

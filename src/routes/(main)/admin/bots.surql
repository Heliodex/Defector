SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	fn::botElo($this.id) AS elo,
	fn::botStats($this.id) AS stats,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY elo DESC, name ASC;

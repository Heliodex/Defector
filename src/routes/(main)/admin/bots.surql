SELECT
	record::id(id) AS id,
	name,
	active,
	created,
	meanScore,
	fn::botStats($this.id) AS stats,
	(SELECT VALUE email FROM ONLY $parent<-created<-user)[0] AS ownerEmail
FROM bot
ORDER BY meanScore DESC, name ASC;

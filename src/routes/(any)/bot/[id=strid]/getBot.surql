SELECT
	record::id(id) AS id,
	name,
	description,
	codeUrl,
	active,
	created,
	meanScore,
	fn::botScoreHistory($this.id) AS scoreHistory,
	fn::botStats($this.id) AS stats,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName,
	(SELECT VALUE source FROM ONLY $parent.code ORDER BY updated)[$] AS source,
	(SELECT VALUE updated FROM ONLY $parent.code ORDER BY updated)[$] AS updated
FROM ONLY $bot;

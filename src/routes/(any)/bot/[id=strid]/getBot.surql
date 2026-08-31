SELECT
	record::id(id) AS id,
	name,
	description,
	codeUrl,
	active,
	created,
	fn::botElo($this.id) AS elo,
	-- convert list of deltas into list of cumulative ELOs
	fn::botEloHistory($this.id).fold(
		[],
		|$acc, $delta| $acc.append($delta + ($acc[$] ?? 0))
	) AS eloHistory,
	fn::botStats($this.id) AS stats,
	(SELECT VALUE extraInfo.name FROM ONLY $parent<-created<-user)[0] AS ownerName,
	(SELECT VALUE source FROM ONLY $parent.code ORDER BY updated)[$] AS source,
	(SELECT VALUE updated FROM ONLY $parent.code ORDER BY updated)[$] AS updated
FROM ONLY $bot;

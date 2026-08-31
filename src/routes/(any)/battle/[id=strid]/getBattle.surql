(SELECT
	record::id(id) AS id,
	created,
	scores,
	eloDelta,
	errors,
	rounds,
	bots
FROM ONLY $battle)
	.chain(|$row| object::extend($row, {
		botNames: fn::battleBotNames($battle),
		botIds: $row.bots.map(|$bot| record::id($bot)),
	}))

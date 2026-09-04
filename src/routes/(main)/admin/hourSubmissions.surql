SELECT
	record::id(id) AS id,
	created,
	name,
	description,
	codeUrl,
	ai,
	image,
	status,
	lapseTimelapses,
	(SELECT record::id(id) AS id, name FROM bot WHERE id IN $parent.bots) AS bots,
	-- object::extend($parent.leaderboard, {
	-- 	bots: $parent.leaderboard.bots.map(|$bot| object::extend($bot, {
	-- 		bot: record::id($bot.bot)
	-- 	}))
	-- }) AS leaderboard,
	(SELECT
		rankedCount,
		bestRank,
		multiplier,
		(SELECT
			record::id(bot) AS bot,
			name,
			meanScore,
			rank,
			multiplier
		FROM $parent.bots) AS bots
	FROM ONLY $parent.leaderboard) AS leaderboard,
	howHear,
	howDoingWell,
	howImprove,
	howLikelyRecommend,
	review,
	# (No ONLY: the WASM engine returns zero rows for FROM ONLY <traversal>; [0] already pins the single edge.)
	(SELECT VALUE email FROM $parent<-submittedHours<-user)[0] AS ownerEmail
FROM hourSubmission
ORDER BY created DESC;

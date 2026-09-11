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
	(SELECT
		notes,
		privateNotes,
		record::id(reviewer) AS reviewer
	FROM ONLY $parent.review) AS review,
	# (No ONLY: the WASM engine returns zero rows for FROM ONLY <traversal>; [0] already pins the single edge.)
	(SELECT VALUE email FROM $parent<-submittedHours<-user)[0] AS ownerEmail,
	# Submitter PII from their Hack Club profile. Only ever exposed on the admin panel.
	(SELECT VALUE {
		givenName: extraInfo.givenName,
		familyName: extraInfo.familyName,
		phoneNumber: extraInfo.phoneNumber,
		birthdate: extraInfo.birthdate,
		address: extraInfo.address
	} FROM $parent<-submittedHours<-user)[0] AS ownerInfo
FROM hourSubmission
ORDER BY created DESC;

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
	howLikelyRecommend,
	(SELECT
		notes
	FROM ONLY $parent.review) AS review
FROM $user->submittedHours->hourSubmission
ORDER BY created DESC;

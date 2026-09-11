# Loads one of the calling user's own submissions for editing. Scoping the traversal to
# $user means another user's submission can never be returned, regardless of the id passed in.
SELECT
	record::id(id) AS id,
	name,
	description,
	codeUrl,
	ai,
	image,
	status,
	howHear,
	howDoingWell,
	howImprove,
	howLikelyRecommend,
	(SELECT
		notes
	FROM ONLY $parent.review) AS review
FROM $user->submittedHours->hourSubmission
WHERE id = $sub;

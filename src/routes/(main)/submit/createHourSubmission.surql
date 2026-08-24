LET $hourSubmission = CREATE ONLY hourSubmission CONTENT {
	image: $image,
	name: $name,
	description: $description,
	codeUrl: $codeUrl,
	playableUrl: $playableUrl,
	ai: $ai,
	howHear: $howHear,
	howDoingWell: $howDoingWell,
	howImprove: $howImprove,
	howLikelyRecommend: $howLikelyRecommend,
	lapseTimelapses: $timelapseIds
} RETURN VALUE id;

$hourSubmission;

RELATE $user->submittedHours->$hourSubmission;
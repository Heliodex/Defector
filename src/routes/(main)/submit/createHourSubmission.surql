LET $hourSubmission = CREATE ONLY hourSubmission CONTENT {
	image: $image,
	name: $name,
	description: $description,
	codeUrl: $codeUrl,
	ai: $ai,
	howHear: $howHear,
	howDoingWell: $howDoingWell,
	howImprove: $howImprove,
	howLikelyRecommend: $howLikelyRecommend,
	lapseTimelapses: $timelapseIds,
	bots: $bots
} RETURN VALUE id;

$hourSubmission;

RELATE $user->submittedHours->$hourSubmission;
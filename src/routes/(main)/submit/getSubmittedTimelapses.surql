# Lists the Lapse timelapse IDs the calling user has already used in any of their hour submissions.
# Mirrors the $submitted collection in getUnsubmittedBots.surql, but for timelapses (stored as strings in hourSubmission.lapseTimelapses).
# Accepts either a user record ID or the full user object from authorise() ($user.id).
array::flatten((SELECT VALUE lapseTimelapses
	FROM $user->submittedHours->hourSubmission
	WHERE lapseTimelapses != NONE) ?? []);

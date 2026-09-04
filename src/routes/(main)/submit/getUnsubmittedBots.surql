# Lists the calling user's bots which haven't been submitted in any of their hour submissions yet.
# Archived bots are excluded - only active/inactive ones can be submitted for hours.
LET $submitted = array::flatten((SELECT VALUE bots FROM $user->submittedHours->hourSubmission WHERE bots != NONE) ?? []);
SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created
FROM $user->created->bot
WHERE id NOT IN $submitted
ORDER BY created DESC;

SELECT
	record::id(id) AS id,
	created,
	name,
	description,
	codeUrl,
	playableUrl,
	ai,
	reviewerNotes,
	lapseTimelapses,
	image,
	SELECT VALUE email FROM ONLY $parent<-createdProject<-user AS submitterEmail
FROM project
ORDER BY created DESC;

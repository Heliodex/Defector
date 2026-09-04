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
	review,
	(SELECT VALUE email FROM ONLY $parent<-submittedHours<-user)[0] AS ownerEmail
FROM hourSubmission
ORDER BY created DESC;

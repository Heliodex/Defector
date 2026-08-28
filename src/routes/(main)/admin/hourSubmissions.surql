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
	review,
	(SELECT VALUE email FROM ONLY $parent<-submittedHours<-user)[0] AS ownerEmail
FROM hourSubmission
ORDER BY created DESC;

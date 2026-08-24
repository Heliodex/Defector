SELECT
	record::id(id) AS id,
	created,
	hours,
	status,
	lapseIds,
	(SELECT VALUE email FROM ONLY $parent.owner)[0] AS ownerEmail
FROM hourSubmission
ORDER BY created DESC;

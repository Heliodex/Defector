SELECT
	record::id(id) AS id,
	created,
	hours,
	status,
	lapseIds
FROM hourSubmission
WHERE owner = $owner
ORDER BY created DESC;

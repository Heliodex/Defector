CREATE ONLY hourSubmission CONTENT {
	owner: $owner,
	lapseIds: $lapseIds,
	hours: $hours,
	status: "pending"
} RETURN VALUE record::id(id) AS id, hours, status;
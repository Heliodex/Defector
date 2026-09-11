# Public, read-only view of a submission. Deliberately returns only the fields that are safe to show to anyone with the link — never the review notes, private notes, timelapses or leaderboard.
# Restricted to approved submissions so unapproved work can't be viewed or indexed.
SELECT
	record::id(id) AS id,
	created,
	name,
	description,
	codeUrl,
	ai,
	image,
	(SELECT record::id(id) AS id, name FROM bot WHERE id IN $parent.bots) AS bots
FROM ONLY $sub
WHERE status = "approved";

# Approve or reject an hour submission. $status is "approved" or "rejected";
# optional $notes are stored on the submission's review object.
UPDATE $id SET
	status = $status,
	review = { reviewer: $admin, notes: $notes ?? "" };

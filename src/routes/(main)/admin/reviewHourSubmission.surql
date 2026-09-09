# Approve or reject an hour submission. $status is "approved" or "rejected";
# optional $notes are public and shown to the submitter; optional $privateNotes are admin-only.
UPDATE $id MERGE {
	status: $status,
	review: {
		reviewer: $admin,
		notes: $notes ?? "",
		privateNotes: $privateNotes ?? ""
	}
};

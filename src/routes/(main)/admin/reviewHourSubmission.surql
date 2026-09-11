# Review an hour submission. $status is "pending", "approved", "needschanges" or "rejected";
# optional $notes are public and shown to the submitter; the remaining notes are admin-only:
# $hoursSpent, $technicalFeatures, $deflation and $privateNotes (additional information).
UPDATE $id MERGE {
	status: $status,
	review: {
		reviewer: $admin,
		notes: $notes ?? "",
		privateNotes: $privateNotes ?? "",
		hoursSpent: $hoursSpent ?? "",
		technicalFeatures: $technicalFeatures ?? "",
		deflation: $deflation ?? ""
	}
};

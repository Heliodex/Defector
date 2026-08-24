# Approve or reject an hour submission ($status is "approved" or "rejected").
LET $u = UPDATE $id SET status = $status, reviewedBy = $admin RETURN AFTER;

{
	id: record::id($u.id),
	status: $u.status,
	hours: $u.hours,
};

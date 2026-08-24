LET $u = SELECT VALUE id FROM user WHERE email = $email;

IF $u {
	UPDATE $u SET extraInfo = $extraInfo;
	$u;
} ELSE {
	CREATE ONLY user CONTENT {
		id: $hcid,
		email: $email,
		extraInfo: $extraInfo
	} RETURN VALUE id;
};

LET $s = SELECT id, expires FROM ONLY $sess;
LET $u = (SELECT
    id,
	email,
	extraInfo
FROM $sess<-hasSession<-user)[0];

IF $s {
	IF $s.expires < time::now() {
		DELETE $s;
	} ELSE IF $s.expires + 15d < time::now() {
		$s.expires = time::now() + 30d;
	};
};

{
	session: IF $s { record::id($s.id) } ELSE { NONE },
	user: $u,
};

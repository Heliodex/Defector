LET $other = SELECT VALUE id FROM user
	WHERE lapseData.id = $lapseData.id AND id != $userId;

IF $other {
	THROW "This Lapse account is already linked to another user";
} ELSE {
	UPDATE $userId SET lapseData = $lapseData;
};

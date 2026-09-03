# Sets a bot's status, enforcing ownership and the 3-active cap.
# $user is the full user object from authorise(); $id is the bot's string id;
# $status is one of "active", "inactive", "archived" (only "active" counts towards the cap).
LET $bot = (SELECT VALUE id FROM bot WHERE record::id(id) = $id)[0];

IF $bot == NONE {
	THROW "Bot not found";
} ELSE IF count(SELECT id FROM $user.id->created->bot WHERE record::id(id) = $id) < 1 {
	THROW "You are not authorised to update this bot.";
} ELSE IF $status = "active" AND count(SELECT id FROM $user.id->created->bot WHERE active = "active" AND id != $bot) >= 3 {
	THROW "You can only have 3 active bots at once";
} ELSE {
	LET $updated = UPDATE ONLY $bot SET active = $status;

	{
		id: record::id($updated.id),
		name: $updated.name,
		active: $updated.active,
	};
};

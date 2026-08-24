# Toggles whether one of $user's bots is active, enforcing the 3-active cap.
LET $bot = (SELECT VALUE id FROM $user->created->bot WHERE record::id(id) = $id)[0];

IF $bot == NONE {
	THROW "Bot not found";
};

IF $active AND count(SELECT id FROM $user->created->bot WHERE active AND id != $bot) >= 3 {
	THROW "You can only have 3 active bots at once";
};

LET $updated = UPDATE $bot SET active = $active RETURN AFTER;

{
	id: record::id($updated.id),
	name: $updated.name,
	active: $updated.active,
};

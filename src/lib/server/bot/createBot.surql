# Create a bot owned by $user. Enforces the per-user limit of 3 active bots.
# $active is still a boolean ("enter tournament immediately" checkbox); it maps to the "active"/"inactive" states.
IF $active AND count(SELECT id FROM $user->created->bot WHERE active = "active") >= 3 {
	THROW "You can only have 3 active bots at once";
} ELSE {
	LET $bot = CREATE ONLY bot CONTENT {
		name: $name,
		description: $description,
		codeUrl: $codeUrl,
		code: [{ source: $source, transpiled: $transpiled }],
		active: IF $active { "active" } ELSE { "inactive" }
	} RETURN VALUE id;

	RELATE $user->created->$bot;

	record::id($bot);
};

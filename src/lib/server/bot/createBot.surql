# Create a bot owned by $user. Enforces the per-user limit of 3 active bots.
IF $active AND count(SELECT id FROM $user->created->bot WHERE active) >= 3 {
	THROW "You can only have 3 active bots at once";
};

LET $bot = CREATE ONLY bot CONTENT {
	name: $name,
	description: $description,
	codeUrl: $codeUrl,
	code: [{ source: $source, transpiled: $transpiled }],
	active: $active
} RETURN VALUE id;

RELATE $user->created->$bot;

record::id($bot);

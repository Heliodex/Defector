# NOTE: fn::battleBotNames() must be called from a plain expression, not a SELECT projection, or SurrealDB re-fetches the bot records for every row (~100x slower).
# See the comment on fn::battleBotNames in src/lib/server/init.surql.
(SELECT
    id,
    created,
    bots
FROM battle
WHERE IF $id { id == $id } ELSE { true }
ORDER BY created DESC
LIMIT 50)
    .map(|$b| {
        id: record::id($b.id),
        created: $b.created,
        botNames: fn::battleBotNames($b.id),
        botIds: $b.bots.map(|$bot| record::id($bot)),
    });

count(SELECT 1 FROM battle);

# omg my previous advice about plain expressions was completely wrong it's way faster to use battleBotNames() in the SELECT (if we have indices)
(SELECT
    id,
    created,
    fn::battleBotNames($this.id) AS botNames,
    bots
FROM battle
WHERE IF $id { id == $id } ELSE { true }
ORDER BY created DESC
LIMIT 50)
    .map(|$b| {
        id: record::id($b.id),
        created: $b.created,
        botNames: $b.botNames,
        botIds: $b.bots.map(|$bot| record::id($bot)),
    });

count(SELECT 1 FROM battle);

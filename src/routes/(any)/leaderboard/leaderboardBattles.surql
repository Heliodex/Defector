# omg my previous advice about plain expressions was completely wrong it's way faster to use battleBotNames() in the SELECT (if we have indices)
SELECT
    record::id(id) AS id,
    created,
    bots,
    fn::battleBotNames($this.id) AS botNames,
    bots.map(|$bot| record::id($bot)) AS botIds
FROM battle
WHERE IF $id { id == $id } ELSE { true }
ORDER BY created DESC;

(SELECT count() FROM battle GROUP ALL)[0].count;

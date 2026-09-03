SELECT
    record::id(id) AS id,
    created,
    scores,
    fn::battleBotNames($this.id) AS botNames,
    bots.map(|$bot| record::id($bot)) AS botIds
FROM battle
WHERE record::id($bot) IN botIds
ORDER BY created DESC
LIMIT 50;

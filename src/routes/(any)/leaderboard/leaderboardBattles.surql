# Initial leaderboard snapshot only: the 50 most recent battles (walks the battleCreated index backwards, so LIMIT 50 really reads 50 rows) plus the all-time count. Live updates never re-run this: the remote builds rows straight from the battle CREATE notifications, which carry the created timestamp and the materialised botIds - no battle table queries at all.
# (The old "WHERE IF $id { id == $id } ELSE { true }" form put the filter behind an expression the planner couldn't turn into an index range, so every live update scanned and sorted the whole battle table.)
# omg my previous advice about plain expressions was completely wrong it's way faster to use battleBotNames() in the SELECT (if we have indices)
SELECT
    record::id(id) AS id,
    created,
    scores,
    fn::battleBotNames($this.id) AS botNames,
    bots.map(|$bot| record::id($bot)) AS botIds
FROM battle
ORDER BY created DESC
LIMIT 50;

(SELECT VALUE count() FROM battle GROUP ALL)[0];

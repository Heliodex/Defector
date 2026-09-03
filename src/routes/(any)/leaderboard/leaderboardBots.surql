# Top 20 ladder rows, read straight from the aggregates cached on each bot record (maintained by the battle/matrix events in init.surql) - zero battle table scans, cheap enough to re-run on every live update. Pushing a new matrix resets every meanScore, so the ladder reflects current- matrix games only; stats (wins/losses/battles) stay all-time.
# (If the bot table ever grows large, a DEFINE INDEX on meanScore could make the ORDER BY walk an index instead of sorting, at the cost of write churn.)

SELECT
	record::id(id) AS id,
	name,
	meanScore,
	fn::botStats(id) AS stats
FROM bot
# Hide under-experienced bots (fewer than 10 battles): reads the cached all-time `battles` counter maintained by the battle events, so this is a plain field check per bot - the old correlated "SELECT count() FROM battle WHERE $parent.id IN bots" scanned the battle table once per bot instead.
# (?? 0 because never-battled bots have battles = NONE until their first battle.)
WHERE (battles ?? 0) >= 10 AND active
ORDER BY meanScore DESC, name ASC
LIMIT 20;

count(SELECT 1 FROM bot WHERE active);

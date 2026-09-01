# Lists the current user's bots, together with their live ladder stats.
# The old version called fn::botElo + fn::botStats per bot, i.e. 2N indexed scans of `battle` (N = number of bots), with per-row function calls and a fold. This instead aggregates straight off the battle table with GROUP BY: two indexed scans total (one per bots-array slot), all summing done natively by the engine.
# Note: this assumes a bot never battles itself (bots = [x, x]), otherwise a self-battle would be counted at both array slots.

LET $bots = (SELECT
	record::id(id) AS id,
	name,
	description,
	active,
	created
FROM $user->created->bot
ORDER BY created DESC);

LET $ids = $bots.map(|$b| $b.id);

# botIds (not bots) is used so these scans can use the battleBotIds index.
# Each battle is aggregated once per array slot, then the two partial aggregates are merged per bot.
LET $agg = (SELECT
		botId,
		math::sum(eloSum) AS eloSum,
		math::sum(wins) AS wins,
		math::sum(losses) AS losses,
		math::sum(battles) AS battles
	FROM (
		(SELECT
			botIds[0] AS botId,
			math::sum(eloDelta[0]) AS eloSum,
			math::sum(IF scores[0] > scores[1] { 1 } ELSE { 0 }) AS wins,
			math::sum(IF scores[0] < scores[1] { 1 } ELSE { 0 }) AS losses,
			count() AS battles
		FROM battle
		WHERE botIds CONTAINSANY $ids
		GROUP BY botIds[0])
		+ (SELECT
			botIds[1] AS botId,
			math::sum(eloDelta[1]) AS eloSum,
			math::sum(IF scores[1] > scores[0] { 1 } ELSE { 0 }) AS wins,
			math::sum(IF scores[1] < scores[0] { 1 } ELSE { 0 }) AS losses,
			count() AS battles
		FROM battle
		WHERE botIds CONTAINSANY $ids
		GROUP BY botIds[1])
	)
	GROUP BY botId);

$bots.map(|$bot| {
	LET $a = $agg.filter(|$x| $x.botId == $bot.id)[0];
	{
		id: $bot.id,
		name: $bot.name,
		description: $bot.description,
		active: $bot.active,
		created: $bot.created,
		# 0 defaults for bots that have never battled
		elo: 1000.0 + ($a.eloSum ?? 0.0),
		stats: {
			wins: $a.wins ?? 0,
			losses: $a.losses ?? 0,
			battles: $a.battles ?? 0,
		},
	}
});

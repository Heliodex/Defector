# Lists the current user's bots, together with their live ladder stats.
# Wins/losses/battles are all-time, but the mean score is scoped to the CURRENT matrix (each battle records the matrix it was played on, so pushing a new matrix resets each bot's average to the games on the new matrix).
# Aggregated straight off the battle table with GROUP BY: two indexed scans total (one per bots-array slot), all summing done natively by the engine.
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
LET $current = fn::latestMatrix();

# botIds (not bots) is used so these scans can use the battleBotIds index.
# Each battle is aggregated once per array slot, then the two partial aggregates
# are merged per bot. scoreSum/curBattles only count current-matrix battles
# (fn::b2i gates on matrix), while wins/losses/battles stay all-time.
LET $agg = (SELECT
		botId,
		math::sum(scoreSum) AS scoreSum,
		math::sum(curBattles) AS curBattles,
		math::sum(wins) AS wins,
		math::sum(losses) AS losses,
		math::sum(battles) AS battles
	FROM (
		(SELECT
			botIds[0] AS botId,
			math::sum(fn::b2i((matrix = $current)) * scores[0]) AS scoreSum,
			math::sum(fn::b2i((matrix = $current))) AS curBattles,
			math::sum(fn::b2i(scores[0] > scores[1])) AS wins,
			math::sum(fn::b2i(scores[0] < scores[1])) AS losses,
			count() AS battles
		FROM battle
		WHERE botIds CONTAINSANY $ids
		GROUP BY botIds[0])
		+
		(SELECT
			botIds[1] AS botId,
			math::sum(fn::b2i((matrix = $current)) * scores[1]) AS scoreSum,
			math::sum(fn::b2i((matrix = $current))) AS curBattles,
			math::sum(fn::b2i(scores[1] > scores[0])) AS wins,
			math::sum(fn::b2i(scores[1] < scores[0])) AS losses,
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
		# mean over current-matrix battles only; 0 for bots with none
		meanScore: ($a.scoreSum ?? 0.0) / math::max([($a.curBattles ?? 0), 1]),
		stats: {
			wins: $a.wins ?? 0,
			losses: $a.losses ?? 0,
			battles: $a.battles ?? 0,
		},
	}
});

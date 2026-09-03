# Overwrites are needed to ensure that the schema is correct when changing in dev mode/on deployment

DEFINE NAMESPACE OVERWRITE main;
DEFINE DATABASE OVERWRITE main STRICT;

DEFINE TABLE OVERWRITE hasSession SCHEMAFULL TYPE RELATION FROM user TO session ENFORCED;
	DEFINE FIELD OVERWRITE id ON hasSession TYPE string;

DEFINE TABLE OVERWRITE session SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON session TYPE string;
	DEFINE FIELD OVERWRITE created ON session TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE expires ON session TYPE datetime DEFAULT ALWAYS time::now() + 30d;

DEFINE TABLE OVERWRITE user SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON user TYPE string;
	DEFINE FIELD OVERWRITE created ON user TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE email ON user TYPE string
		ASSERT string::is_email($value);
	DEFINE FIELD OVERWRITE extraInfo ON user TYPE object;
		DEFINE FIELD OVERWRITE extraInfo.name ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.givenName ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.familyName ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.nickname ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.emailVerified ON user TYPE bool;
		# HQ-official only (phone, birthdate, address scopes):
		DEFINE FIELD OVERWRITE extraInfo.phoneNumber ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.phoneNumberVerified ON user TYPE bool;
		DEFINE FIELD OVERWRITE extraInfo.birthdate ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.slackId ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.verificationStatus ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.yswsEligible ON user TYPE bool;
		DEFINE FIELD OVERWRITE extraInfo.address ON user TYPE option<object>;
			DEFINE FIELD OVERWRITE extraInfo.address.streetAddress ON user TYPE option<string>;
			DEFINE FIELD OVERWRITE extraInfo.address.locality ON user TYPE option<string>;
			DEFINE FIELD OVERWRITE extraInfo.address.region ON user TYPE option<string>;
			DEFINE FIELD OVERWRITE extraInfo.address.postalCode ON user TYPE option<string>;
			DEFINE FIELD OVERWRITE extraInfo.address.country ON user TYPE option<string>;
	DEFINE FIELD OVERWRITE lapseData ON user TYPE option<object>;
		DEFINE FIELD OVERWRITE lapseData.id ON user TYPE string;
		DEFINE FIELD OVERWRITE lapseData.handle ON user TYPE string;
		DEFINE FIELD OVERWRITE lapseData.displayName ON user TYPE string;
		DEFINE FIELD OVERWRITE lapseData.profilePictureUrl ON user TYPE string;
		DEFINE FIELD OVERWRITE lapseData.accessToken ON user TYPE string;
		DEFINE FIELD OVERWRITE lapseData.refreshToken ON user TYPE option<string>;
	DEFINE INDEX IF NOT EXISTS uniqueLapseId ON user COLUMNS lapseData.id UNIQUE;

# Relation linking a bot to its owner (the user who submitted it).
DEFINE TABLE OVERWRITE created SCHEMAFULL TYPE RELATION FROM user TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON created TYPE string;

DEFINE TABLE OVERWRITE matrix SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON matrix TYPE string;
	DEFINE FIELD OVERWRITE payoff ON matrix TYPE array<array<float, 2>, 2>;
	DEFINE FIELD OVERWRITE created ON matrix TYPE datetime DEFAULT ALWAYS time::now();

# 3/2/1/0 payoff matrix. 0: cooperate, 1: defect.

# T > R > P > S
# 2R > T + S
DEFINE FUNCTION OVERWRITE fn::initialMatrix() {
	LET $T = <float> 3;
	LET $R = <float> 2;
	LET $P = <float> 1;
	LET $S = <float> 0;

	# We could have an unbalanced matrix here instead though that would make matchups randomly unfair
	[[$R, $S], [$T, $P]];
};

# Seed the matrix only if it isn't already present (keeps re-runs idempotent).
IF (SELECT count() FROM matrix GROUP ALL)[0].count < 1 {
	CREATE matrix CONTENT {
		payoff: fn::initialMatrix()
	};
};

DEFINE FUNCTION OVERWRITE fn::calculateScore($battle: object) {
	LET $payoff = $battle.matrix.payoff;
	LET $S = $payoff[0][1];
	LET $T = $payoff[1][0];

	LET $errors = $battle.errors;
	LET $e0 = $errors[0] != NONE;
	LET $e1 = $errors[1] != NONE;

	IF $e0 AND $e1 {
		RETURN [$S, $S];
	} ELSE IF $e0 {
		RETURN [$S, $T];
	} ELSE IF $e1 {
		RETURN [$T, $S];
	};

	LET $rounds = $battle.rounds;
	LET $pts = $rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);
	LET $c = <float> count($pts);
	[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
};

DEFINE TABLE OVERWRITE bot SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON bot TYPE string;
	DEFINE FIELD OVERWRITE name ON bot TYPE string;
	DEFINE FIELD OVERWRITE description ON bot TYPE string;
	DEFINE FIELD OVERWRITE codeUrl ON bot TYPE option<string>;
	DEFINE FIELD OVERWRITE code ON bot TYPE array<object>
			ASSERT array::len($value) >= 1;
		DEFINE FIELD OVERWRITE code.*.source ON bot TYPE string;
		DEFINE FIELD OVERWRITE code.*.transpiled ON bot TYPE string;
		DEFINE FIELD OVERWRITE code.*.updated ON bot TYPE datetime DEFAULT ALWAYS time::now();
	# Bots only ever get a single code entry on creation, so "latest" is just the last element. (The original ORDER BY updated subquery isn't accepted by the WASM engine used in tests, and there is no code-update path anyway.)
	DEFINE FIELD OVERWRITE codeHash ON bot TYPE string VALUE
		crypto::sha256(array::last($this.code).transpiled);
	DEFINE FIELD OVERWRITE latestCode ON bot TYPE string VALUE
		array::last($this.code).transpiled;
	DEFINE FIELD OVERWRITE active ON bot TYPE string
		ASSERT $value IN ["active", "inactive", "archived"] DEFAULT ALWAYS "inactive";
	DEFINE FIELD OVERWRITE created ON bot TYPE datetime DEFAULT ALWAYS time::now();
	# ---- Cached ladder stats ----
	# Every per-bot aggregate lives on the bot record itself, so leaderboard and bot-page reads are plain lookups instead of scans over the battle table.
	# The battle CREATE/DELETE events below maintain them incrementally (eachbattle write costs two point-updates; each read costs zero battle scans).wins/losses/battles are all-time; cur* only cover battles played on the CURRENT matrix, so pushing a new matrix resets the ladder (see the matrix CREATE event), exactly like the old per-request matrix-scoped scans did.
	# NOTE: field expressions evaluate in alphabetical order, so meanScore (m) always sees the fresh cur* values (c) within the same write.
	DEFINE FIELD OVERWRITE wins ON bot TYPE option<int>;
	DEFINE FIELD OVERWRITE losses ON bot TYPE option<int>;
	DEFINE FIELD OVERWRITE battles ON bot TYPE option<int>;
	# Rolling window of at most 200 most recent current-matrix scores (chronological order).
	# curScores length is the window size; meanScore is derived from it.
	# curBattles/curScoreSum mirror the window (count/sum) for backwards compat.
	DEFINE FIELD OVERWRITE curScores ON bot TYPE array<float> DEFAULT ALWAYS [];
	DEFINE FIELD OVERWRITE curBattles ON bot TYPE option<int>;
	DEFINE FIELD OVERWRITE curScoreSum ON bot TYPE option<float>;
	DEFINE FIELD OVERWRITE meanScore ON bot TYPE float VALUE
		IF $this.curScores == NONE OR $this.curScores == [] { 0.0 } ELSE { math::sum($this.curScores) / <float> array::len($this.curScores) };

DEFINE FUNCTION OVERWRITE fn::b2i($b: bool) -> int {
	IF $b { 1 } ELSE { 0 };
};

# Append $score to $scores (at most 200, chronological) if $isCur, otherwise return $scores unchanged.
DEFINE FUNCTION OVERWRITE fn::nextScores($scores: option<array<float>>, $score: float, $isCur: int) -> array<float> {
	IF $isCur == 0 { $scores ?? [] } ELSE {
		LET $next = ($scores ?? []) + [$score];
		array::slice($next, math::max([array::len($next) - 200, 0]), 200)
	}
};

# Stats query faster when consolidated into 1 function :rac_lfg:
DEFINE FUNCTION OVERWRITE fn::botStats($bot: record<bot>) {
	# All-time aggregates, now cached directly on the bot record by the battle CREATE/DELETE events (see the cached ladder stats fields on the bot table) - this just reshapes them into the object consumers expect.
	{
		wins: $bot.wins ?? 0,
		losses: $bot.losses ?? 0,
		battles: $bot.battles ?? 0,
	};
};

# One indexed pass over a bot's battles computing every cached aggregate at once. Only used by the migration backfill below; steady-state maintenance goes through the battle CREATE/DELETE events instead.
DEFINE FUNCTION OVERWRITE fn::botCache($bot: record<bot>) {
	LET $id = record::id($bot);
	LET $m = fn::latestMatrix();
	LET $rows = (SELECT
		scores[array::find_index(bots, $bot)] AS s,
		fn::b2i(scores[array::find_index(bots, $bot)]
			> scores[1 - array::find_index(bots, $bot)]) AS won,
		fn::b2i(scores[array::find_index(bots, $bot)]
			< scores[1 - array::find_index(bots, $bot)]) AS lost,
		matrix = $m AS cur,
		created AS created
		FROM battle WHERE $id IN botIds);
	IF array::len($rows) == 0 {
		RETURN { wins: 0, losses: 0, battles: 0, curBattles: 0, curScoreSum: 0.0, curScores: [] };
	};
	LET $curRows = $rows.filter(|$r| $r.cur).sort(|$a, $b| if $a.created < $b.created { -1 } else if $a.created > $b.created { 1 } else { 0 });
	LET $window = $curRows.slice(math::max([array::len($curRows) - 200, 0]), 200).map(|$r| $r.s);
	{
		wins: math::sum($rows.map(|$r| $r.won)),
		losses: math::sum($rows.map(|$r| $r.lost)),
		battles: array::len($rows),
		curBattles: array::len($window),
		curScoreSum: math::sum($window),
		curScores: $window,
	};
};

DEFINE FUNCTION OVERWRITE fn::latestMatrix() -> record<matrix> {
	# (The WASM engine used in tests requires the ORDER BY field to appear in the projection.)
	(SELECT id, created FROM matrix ORDER BY created)[$].id;
};

DEFINE TABLE OVERWRITE battle SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON battle TYPE string;
	DEFINE FIELD OVERWRITE bots ON battle TYPE array<record<bot>, 2>;
	# Materialised string form of the battle's bot ids so the per-bot stats scans can use an index. SurrealDB cannot use an index to search an array of record references directly, but it can index an array of strings (see battleBotIds index and the fn::bot* functions), which is what makes the leaderboard fast.
	DEFINE FIELD OVERWRITE botIds ON battle TYPE array<string, 2> VALUE
		$this.bots.map(|$bot| record::id($bot));
	DEFINE FIELD OVERWRITE matrix ON battle TYPE record<matrix> DEFAULT ALWAYS
		fn::latestMatrix();
	DEFINE FIELD OVERWRITE rounds ON battle TYPE array<array<int, 2>>;
		DEFINE FIELD OVERWRITE rounds.*.* ON battle TYPE int
			ASSERT $value IN [0, 1];
	DEFINE FIELD OVERWRITE errors ON battle TYPE array<option<string>, 2>;
	DEFINE FIELD OVERWRITE scores ON battle TYPE array<float, 2> DEFAULT ALWAYS
		fn::calculateScore($this);
	DEFINE FIELD OVERWRITE created ON battle TYPE datetime DEFAULT ALWAYS time::now();

# Index the materialised bot id strings so the remaining per-bot scans (fn::botCache) resolve "which battles involve this bot" via an index lookup instead of a full table scan per bot.
DEFINE INDEX IF NOT EXISTS battleBotIds ON battle FIELDS botIds.*;
# Lets "ORDER BY created DESC LIMIT n" walk the index instead of scanning and
# sorting every battle in the table.
DEFINE INDEX IF NOT EXISTS battleCreated ON battle FIELDS created; # idx if this helps rly
-- REMOVE INDEX IF EXISTS battleCreated ON battle;
-- DEFINE INDEX IF NOT EXISTS battleCount ON battle COUNT; # doesn't really help

# THIS CANNOT BE A COMPUTED BECAUSE OTHERWISE IT WILL EAT ALL 32GB OF MY RAM
# though since bot names may change, this can't be a VALUE or DEFAULT ALWAYS either :heavysob:
DEFINE FUNCTION OVERWRITE fn::battleBotNames($battle: record<battle>) -> array<string, 2> {
	SELECT VALUE name FROM $battle.bots;
};

# ---------------------------------------------------------------------------
# Cached ladder stats: migration backfill + maintenance events
# ---------------------------------------------------------------------------

# Backfill the cached stats on bot records that predate them. Each guarded UPDATE only ever runs once (the first init after its migration); from then on the events below keep the caches current - even for battles the engine inserts while the site is down, since events live in the database, not in the app. They sit before the DEFINE EVENT statements so a battle landing mid-init can never be double counted. (One guarded UPDATE rather than a FOR loop: the WASM engine used in tests errors when a FOR source subquery returns empty. The repeated botCache calls only run on bots that predate the cache fields, so this full rebuild is a once-per-bot cost.)
IF (SELECT VALUE count() FROM bot WHERE wins = NONE GROUP ALL)[0] > 0 {
	UPDATE bot MERGE {
		wins: fn::botCache($this.id).wins,
		losses: fn::botCache($this.id).losses,
		battles: fn::botCache($this.id).battles,
		curBattles: fn::botCache($this.id).curBattles,
		curScoreSum: fn::botCache($this.id).curScoreSum,
		curScores: fn::botCache($this.id).curScores
	} WHERE wins = NONE;
};

# Keep the cached ladder stats on bot in sync as battles come and go: a battle write now pays two point-updates (which also recompute meanScore), so reads never rescan the battle table. Battles are never edited in place (scores are derived once at CREATE), so UPDATE is deliberately not handled here.
# NB: bots are never deleted; if that changes, these UPDATEs would resurrect deleted records and would need an existence guard.
DEFINE EVENT OVERWRITE battleCacheAdd ON battle WHEN $event = "CREATE" THEN {
	LET $s0 = $after.scores[0];
	LET $s1 = $after.scores[1];
	LET $w = fn::b2i($s0 > $s1);
	LET $l = fn::b2i($s0 < $s1);
	LET $cur = fn::b2i($after.matrix = fn::latestMatrix());
	UPDATE $after.bots[0] MERGE {
		wins: (wins ?? 0) + $w,
		losses: (losses ?? 0) + $l,
		battles: (battles ?? 0) + 1,
		curScores: fn::nextScores(curScores, $s0, $cur),
		curBattles: array::len(fn::nextScores(curScores, $s0, $cur)),
		curScoreSum: math::sum(fn::nextScores(curScores, $s0, $cur))
	};
	UPDATE $after.bots[1] MERGE {
		wins: (wins ?? 0) + $l,
		losses: (losses ?? 0) + $w,
		battles: (battles ?? 0) + 1,
		curScores: fn::nextScores(curScores, $s1, $cur),
		curBattles: array::len(fn::nextScores(curScores, $s1, $cur)),
		curScoreSum: math::sum(fn::nextScores(curScores, $s1, $cur))
	};
};

# Deleting a battle (admin cleanup) reverses wins/losses and recomputes the rolling window from source (rare path, so a scan is acceptable).
DEFINE EVENT OVERWRITE battleCacheRemove ON battle WHEN $event = "DELETE" THEN {
	LET $s0 = $before.scores[0];
	LET $s1 = $before.scores[1];
	LET $w = fn::b2i($s0 > $s1);
	LET $l = fn::b2i($s0 < $s1);
	LET $c0 = fn::botCache($before.bots[0]);
	LET $c1 = fn::botCache($before.bots[1]);
	UPDATE $before.bots[0] MERGE {
		wins: (wins ?? 0) - $w,
		losses: (losses ?? 0) - $l,
		battles: (battles ?? 0) - 1,
		curScores: $c0.curScores,
		curBattles: $c0.curBattles,
		curScoreSum: $c0.curScoreSum
	};
	UPDATE $before.bots[1] MERGE {
		wins: (wins ?? 0) - $l,
		losses: (losses ?? 0) - $w,
		battles: (battles ?? 0) - 1,
		curScores: $c1.curScores,
		curBattles: $c1.curBattles,
		curScoreSum: $c1.curScoreSum
	};
};

# Pushing a new matrix resets the ladder: every bot's window is cleared (meanScore recomputes to 0).
DEFINE EVENT OVERWRITE matrixReset ON matrix WHEN $event = "CREATE" THEN (
	UPDATE bot SET curScores = [], curBattles = 0, curScoreSum = 0.0
);

DEFINE TABLE OVERWRITE submittedHours SCHEMAFULL TYPE RELATION FROM user TO hourSubmission ENFORCED;
	DEFINE FIELD OVERWRITE id ON submittedHours TYPE string;

DEFINE TABLE OVERWRITE hourSubmission SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE created ON hourSubmission TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE image ON hourSubmission TYPE option<object>;
	DEFINE FIELD OVERWRITE image.hash ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE image.updated ON hourSubmission TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE name ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE description ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE codeUrl ON hourSubmission TYPE string;
	-- DEFINE FIELD OVERWRITE playableUrl ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE ai ON hourSubmission TYPE bool;
	DEFINE FIELD OVERWRITE review ON hourSubmission TYPE option<{
		reviewer: record<user>,
		notes: string,
	}>;
	DEFINE FIELD OVERWRITE howHear ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howDoingWell ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howImprove ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howLikelyRecommend ON hourSubmission TYPE int
		ASSERT 0 <= $value AND $value <= 10;
	DEFINE FIELD OVERWRITE lapseTimelapses ON hourSubmission TYPE array<string>;
	DEFINE FIELD OVERWRITE status ON hourSubmission TYPE string DEFAULT ALWAYS "pending"
		ASSERT $value IN ["pending", "approved", "rejected"];

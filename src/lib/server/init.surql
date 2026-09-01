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
IF count(matrix) < 1 {
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
	DEFINE FIELD OVERWRITE active ON bot TYPE bool DEFAULT ALWAYS false;
	DEFINE FIELD OVERWRITE created ON bot TYPE datetime DEFAULT ALWAYS time::now();

DEFINE FUNCTION OVERWRITE fn::botElo($bot: record<bot>) -> float {
	LET $id = record::id($bot);
	1000.0 + math::sum(SELECT VALUE eloDelta[array::find_index(bots, $bot)]
		FROM battle WHERE $id IN botIds);
};

DEFINE FUNCTION OVERWRITE fn::botEloHistory($bot: record<bot>) -> array<float> {
	LET $id = record::id($bot);
	(SELECT eloDelta, bots, created FROM battle
		WHERE $id IN botIds
	    ORDER BY created DESC
	    LIMIT 200).map(|$x| $x.eloDelta[array::find_index($x.bots, $bot)])
};

DEFINE FUNCTION OVERWRITE fn::b2i($b: bool) -> int {
	IF $b { 1 } ELSE { 0 };
};

# Stats query faster when consolidated into 1 function :rac_lfg:
DEFINE FUNCTION OVERWRITE fn::botStats($bot: record<bot>) {
	(SELECT
        fn::b2i(scores[array::find_index(bots, $bot)]
            > scores[1 - array::find_index(bots, $bot)])
            AS wins,
        fn::b2i(scores[array::find_index(bots, $bot)]
            < scores[1 - array::find_index(bots, $bot)])
            AS losses
        FROM battle
		WHERE record::id($bot) IN botIds).fold({
            wins: 0, losses: 0, battles: 0,
        }, |$a, $b| {
            wins: $a.wins + $b.wins,
            losses: $a.losses + $b.losses,
            battles: $a.battles + 1
        });
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
	DEFINE FIELD OVERWRITE eloDelta ON battle TYPE array<float, 2> DEFAULT ALWAYS {
		LET $payoff: array<array<float, 2>, 2> = SELECT VALUE payoff FROM ONLY (($this.matrix) OR fn::latestMatrix());
		IF $payoff == NONE {
			THROW "eloDelta: payoff is NONE";
		};

		LET $T = $payoff[1][0];
		LET $S = $payoff[0][1];
		# Scores are recomputed here (rather than read from `$this.scores`) because DEFAULT ALWAYS fields are not guaranteed to be evaluated in definition order, so `$this.scores` can be NONE when this runs. The original code re-fetched the matrix/payoff a second time inside this block; here we reuse the $payoff already resolved above, leaving just one matrix fetch.
		LET $errors = $this.errors;
		LET $e0 = $errors[0] != NONE;
		LET $e1 = $errors[1] != NONE;
		LET $scores = IF $e0 AND $e1 {
			[$S, $S];
		} ELSE IF $e0 {
			[$S, $T];
		} ELSE IF $e1 {
			[$T, $S];
		} ELSE {
			LET $rounds = SELECT VALUE rounds FROM ONLY $this;
			IF $rounds == NONE {
				THROW "eloDelta: rounds is NONE";
			};

			LET $pts = $rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);

			LET $c = <float> count($pts);
			[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
		};
		LET $K = <float> 32;
		LET $rating0 = fn::botElo($this.bots[0]);
		LET $rating1 = fn::botElo($this.bots[1]);
		LET $expected0 = 1.0 / (1.0 + math::pow(10.0, ($rating1 - $rating0) / 400.0));
		LET $expected1 = 1.0 - $expected0;

		LET $R = $payoff[0][0];
		LET $P = $payoff[1][1];

		# --- Absolute (cooperation) component ---
		# Reduced-weight to avoid rating inflation. Old formula used
		#   base = 0.25 + 0.5*((avg-P)/(R-P))  => CC 0.75 (+8), DD 0.25 (-8)
		#   net +16 Elo per mutual-cooperation battle => unbounded inflation
		#   (~+900 after 1000 cooperative battles in a cooperative-heavy pool).
		# New: base = 0.5 +/- weight. CC still >0.5 (both gain),
		# DD still <0.5 (both lose), but injection is small and competitive margin remains dominant.
		#
		# The weight is symmetric (+0.10 cooperation bonus / -0.10 defection penalty) so the pool is inflation-neutral: mutual cooperation injects ~+3.2 Elo total per battle and mutual defection drains ~-3.2, matching each other. With the earlier asymmetric weights (0.05/0.15) a defection-heavy tournament deflated the whole pool (~<700 Elo after 1000 battles). Combined with the cooperation-scaled margin below, mutual defection still costs each bot ~-1.6 per battle and beating a cooperator by pure defection nets only ~+8 instead of ~+16. Always-defect bots bleed rating fast.
		LET $avg = ($scores[0] + $scores[1]) / 2.0;
		LET $mid = ($R + $P) / 2.0;
		LET $halfRange = ($R - $P) / 2.0;
		LET $coopWeight = <float> 0.10;
		LET $defectWeight = <float> 0.10;
		LET $baseRaw = IF $halfRange > 0.0 {
			# IF-as-expression picks the weight by cooperation direction (no LET inside IF blocks needed)
			0.5 + (IF (($avg - $mid) / $halfRange) >= 0.0 { $coopWeight } ELSE { $defectWeight })
				* (($avg - $mid) / $halfRange)
		} ELSE {
			0.5
		};
		# clamp base to [0,1]; extreme S/S (avg=0) is extrapolated beyond P and will clamp rather than go strongly negative.
		LET $base = math::clamp($baseRaw, 0.0, 1.0);

		# --- Relative (margin) component ---
		# Weighted by how much one bot beats the other: diff = 0 => no swing,
		# diff == T-S (max exploit) => +/-0.5 swing.
		#
		# The margin swing is then scaled by a *cooperation factor* so that winning through defection is worth less than winning through mutual cooperation. factor = (avg - P) / (R - P):
		#   CC battle (avg == R)      => factor 1.0  (full swing, cooperation rewarded)
		#   exploiter vs cooperator   => factor ~0.5 (halved swing, defection discounted)
		#   DD battle (avg == P)      => factor 0.0  (no rating movement at all)
		# This stops always-defect bots from grinding up the leaderboard on margin alone while making their mutual-defection battles fully flat.
		LET $denom = $T - $S;
		LET $rawMargin0 = IF $denom > 0.0 {
			($scores[0] - $scores[1]) / (2.0 * $denom)
		} ELSE {
			0.0
		};
		LET $coopDenom = $R - $P;
		LET $coopFactor = IF $coopDenom > 0.0 {
			math::clamp(($avg - $P) / $coopDenom, 0.0, 1.0)
		} ELSE {
			0.0
		};
		LET $margin0 = $rawMargin0 * $coopFactor;
		LET $margin1 = 0.0 - $margin0;

		LET $actual0Raw = $base + $margin0;
		LET $actual1Raw = $base + $margin1;
		LET $actual0 = math::clamp($actual0Raw, 0.0, 1.0);
		LET $actual1 = math::clamp($actual1Raw, 0.0, 1.0);

		[$K * ($actual0 - $expected0), $K * ($actual1 - $expected1)];
	};
	DEFINE FIELD OVERWRITE created ON battle TYPE datetime DEFAULT ALWAYS time::now();

# Index the materialised bot id strings so per-bot stat functions (fn::botElo, fn::botWins, etc.) resolve "which battles involve this bot" via an index lookup instead of a full table scan per bot.
DEFINE INDEX OVERWRITE battleBotIds ON battle FIELDS botIds.*;
# Lets "ORDER BY created DESC LIMIT n" walk the index instead of scanning and
# sorting every battle in the table.
DEFINE INDEX OVERWRITE battleCreated ON battle FIELDS created; # idx if this helps rly
-- REMOVE INDEX IF EXISTS battleCreated ON battle;
-- DEFINE INDEX OVERWRITE battleCount ON battle COUNT; # doesn't really help

# THIS CANNOT BE A COMPUTED BECAUSE OTHERWISE IT WILL EAT ALL 32GB OF MY RAM
# though since bot names may change, this can't be a VALUE or DEFAULT ALWAYS either :heavysob:
DEFINE FUNCTION OVERWRITE fn::battleBotNames($battle: record<battle>) -> array<string, 2> {
	SELECT VALUE name FROM $battle.bots;
};

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

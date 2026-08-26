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
		-- DEFINE FIELD OVERWRITE extraInfo.phoneNumber ON user TYPE string;
		-- DEFINE FIELD OVERWRITE extraInfo.phoneNumberVerified ON user TYPE bool;
		-- DEFINE FIELD OVERWRITE extraInfo.birthdate ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.slackId ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.verificationStatus ON user TYPE string;
		DEFINE FIELD OVERWRITE extraInfo.yswsEligible ON user TYPE bool;
		-- DEFINE FIELD OVERWRITE extraInfo.address ON user TYPE option<object>;
			-- DEFINE FIELD OVERWRITE extraInfo.address.streetAddress ON user TYPE option<string>;
			-- DEFINE FIELD OVERWRITE extraInfo.address.locality ON user TYPE option<string>;
			-- DEFINE FIELD OVERWRITE extraInfo.address.region ON user TYPE option<string>;
			-- DEFINE FIELD OVERWRITE extraInfo.address.postalCode ON user TYPE option<string>;
			-- DEFINE FIELD OVERWRITE extraInfo.address.country ON user TYPE option<string>;
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
	DEFINE FIELD OVERWRITE codeHash ON bot TYPE string VALUE
		crypto::sha256((SELECT VALUE transpiled FROM $this.code ORDER BY updated)[$]);
	DEFINE FIELD OVERWRITE latestCode ON bot TYPE string VALUE
		(SELECT VALUE transpiled FROM $this.code ORDER BY updated)[$];
	DEFINE FIELD OVERWRITE active ON bot TYPE bool DEFAULT ALWAYS false;
	DEFINE FIELD OVERWRITE created ON bot TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE elo ON bot TYPE float COMPUTED {
		LET $deltas = SELECT VALUE eloDelta[array::find_index(bots, $parent.id)]
			FROM battle WHERE $parent.id IN bots;

		1000.0 + math::sum($deltas);
	};
	REMOVE FIELD IF EXISTS eloHistory.* ON bot; # WHY
	DEFINE FIELD OVERWRITE eloHistory ON bot TYPE array<float> COMPUTED
		SELECT VALUE eloDelta[array::find_index(bots, $parent.id)]
		FROM battle WHERE $parent.id IN bots
		ORDER BY created DESC
		LIMIT 200;
	DEFINE FIELD OVERWRITE wins ON bot TYPE int COMPUTED
		(SELECT VALUE {
			LET $idx = array::find_index(bots, $parent.id)
			$this.scores[$idx] > $this.scores[1 - $idx]
		} FROM battle WHERE $parent.id IN bots)
			[? $this].chain(|$v| count($v));
	DEFINE FIELD OVERWRITE losses ON bot TYPE int COMPUTED
		(SELECT VALUE {
			LET $idx = array::find_index(bots, $parent.id)
			$this.scores[$idx] < $this.scores[1 - $idx]
		} FROM battle WHERE $parent.id IN bots)
			[? $this].chain(|$v| count($v));
	DEFINE FIELD OVERWRITE totalBattles ON bot TYPE int COMPUTED
		count(SELECT 1 FROM battle WHERE $parent.id IN bots);

DEFINE FUNCTION OVERWRITE fn::latestMatrix() -> record<matrix> {
	(SELECT VALUE id FROM matrix ORDER BY created)[$];
};

DEFINE TABLE OVERWRITE battle SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON battle TYPE string;
	DEFINE FIELD OVERWRITE bots ON battle TYPE array<record<bot>, 2>;
	DEFINE FIELD OVERWRITE matrix ON battle TYPE record<matrix> DEFAULT ALWAYS
		fn::latestMatrix();
	DEFINE FIELD OVERWRITE rounds ON battle TYPE array<array<int, 2>>;
		DEFINE FIELD OVERWRITE rounds.*.* ON battle TYPE int
			ASSERT $value IN [0, 1];
	DEFINE FIELD OVERWRITE errors ON battle TYPE array<option<string>, 2>;
	DEFINE FIELD OVERWRITE scores ON battle TYPE array<float, 2> DEFAULT ALWAYS
		fn::calculateScore($this);
	DEFINE FIELD OVERWRITE eloDelta ON battle TYPE array<float, 2> DEFAULT ALWAYS {
		LET $matrix: record<matrix> = (SELECT VALUE matrix FROM ONLY $this) OR fn::latestMatrix();
		LET $payoff: array<array<float, 2>, 2> = SELECT VALUE payoff FROM ONLY $matrix;
		IF !$payoff {
			THROW "eloDelta: payoff is NONE";
		};

		LET $T = $payoff[1][0];
		LET $S = $payoff[0][1];
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
			LET $matrix: record<matrix> = (SELECT VALUE matrix FROM ONLY $this) OR fn::latestMatrix();
			LET $payoff: array<array<float, 2>, 2> = SELECT VALUE payoff FROM ONLY $matrix;
			IF !$payoff {
				THROW "eloDelta: payoff is NONE in scores";
			};

			LET $rounds = SELECT VALUE rounds FROM ONLY $this;
			IF !$rounds {
				THROW "eloDelta: rounds is NONE";
			};

			LET $pts = $rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);

			LET $c = <float> count($pts);
			[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
		};
		LET $K = <float> 32;
		LET $rating0 = SELECT VALUE elo FROM ONLY $this.bots[0];
		LET $rating1 = SELECT VALUE elo FROM ONLY $this.bots[1];
		LET $expected0 = 1.0 / (1.0 + math::pow(10.0, ($rating1 - $rating0) / 400.0));
		LET $expected1 = 1.0 - $expected0;
		LET $actual0 = IF $scores[0] > $scores[1] {
			1.0
		} ELSE IF $scores[0] < $scores[1] {
			0.0
		} ELSE {
			0.5
		};
		LET $actual1 = 1.0 - $actual0;

		[$K * ($actual0 - $expected0), $K * ($actual1 - $expected1)]
	};
	DEFINE FIELD OVERWRITE created ON battle TYPE datetime DEFAULT ALWAYS time::now();

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
	DEFINE FIELD OVERWRITE playableUrl ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE ai ON hourSubmission TYPE bool;
	DEFINE FIELD OVERWRITE review ON hourSubmission TYPE option<{
		reviewer: record<user>,
		notes: string,
	}>;
	DEFINE FIELD OVERWRITE howHear ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howDoingWell ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howImprove ON hourSubmission TYPE option<string>;
	DEFINE FIELD OVERWRITE howLikelyRecommend ON hourSubmission TYPE option<int>
		ASSERT 1 <= $value AND $value <= 10;
	DEFINE FIELD OVERWRITE lapseTimelapses ON hourSubmission TYPE array<string>;
	DEFINE FIELD OVERWRITE status ON hourSubmission TYPE string DEFAULT ALWAYS "pending"
		ASSERT $value IN ["pending", "approved", "rejected"];

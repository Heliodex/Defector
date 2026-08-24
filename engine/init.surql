DEFINE TABLE OVERWRITE created SCHEMAFULL TYPE RELATION FROM user TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON created TYPE string;

REMOVE TABLE matrix;
REMOVE TABLE bot;
REMOVE TABLE battle;

DEFINE TABLE OVERWRITE matrix SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON matrix TYPE string;
	DEFINE FIELD OVERWRITE payoff ON matrix TYPE array<array<float, 2>, 2>;
	DEFINE FIELD OVERWRITE created ON matrix TYPE datetime DEFAULT ALWAYS time::now();

# T > R > P > S
# 2R > T + S

DEFINE FUNCTION OVERWRITE fn::initialMatrix() {
	LET $T = <float> 3;
	LET $R = <float> 2;
	LET $P = <float> 1;
	LET $S = <float> 0;

	RETURN [[$R, $S], [$T, $P]];
};

# 0: cooperate, 1: defect
CREATE matrix CONTENT {
	payoff: fn::initialMatrix()
};

DEFINE FUNCTION OVERWRITE fn::calculateScore($battle: object) {
	LET $initialMatrix = fn::initialMatrix();
	LET $T = $initialMatrix[1][0];
	LET $S = $initialMatrix[0][1];

	LET $errors = $battle.errors;
	LET $e0 = $errors[0] != NONE;
	LET $e1 = $errors[1] != NONE;

	# Punish bots for errors
	IF $e0 AND $e1 {
		RETURN [$S, $S];
	} ELSE IF $e0 {
		RETURN [$S, $T];
	} ELSE IF $e1 {
		RETURN [$T, $S];
	};

	LET $payoff = $battle.matrix.payoff;
	LET $pts = $battle.rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);
	LET $c = <float> count($pts);
	[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
};

DEFINE TABLE OVERWRITE bot SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON bot TYPE string;
	DEFINE FIELD OVERWRITE name ON bot TYPE string;
	DEFINE FIELD OVERWRITE description ON bot TYPE string;
	DEFINE FIELD OVERWRITE code ON bot TYPE array<object> DEFAULT ALWAYS []
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
		LET $deltas = SELECT VALUE IF bots[0] = $parent.id {
			eloDelta[0]
		} ELSE {
			eloDelta[1]
		} FROM battle WHERE $parent.id IN bots AND eloDelta != NONE;

		1000.0 + (math::sum($deltas) ?? 0.0)
	};
	DEFINE FIELD OVERWRITE wins ON bot TYPE int COMPUTED {
		LET $results = SELECT VALUE IF bots[0] = $parent.id {
			LET $score = fn::calculateScore($this);
			$score[0] > $score[1]
		} ELSE {
			LET $score = fn::calculateScore($this);
			$score[1] > $score[0]
		} FROM battle WHERE $parent.id IN bots;

		count($results.filter(|$w| $w == true))
	};
	DEFINE FIELD OVERWRITE losses ON bot TYPE int COMPUTED {
		LET $results = SELECT VALUE IF bots[0] = $parent.id {
			LET $score = fn::calculateScore($this);
			$score[0] < $score[1]
		} ELSE {
			LET $score = fn::calculateScore($this);
			$score[1] < $score[0]
		} FROM battle WHERE $parent.id IN bots;

		count($results.filter(|$w| $w == true))
	};
	DEFINE FIELD OVERWRITE totalBattles ON bot TYPE int COMPUTED {
		LET $battles = SELECT VALUE id FROM battle WHERE $parent.id IN bots;

		count($battles)
	};

DEFINE TABLE OVERWRITE battle SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON battle TYPE string;
	DEFINE FIELD OVERWRITE bots ON battle TYPE array<record<bot>, 2>;
	DEFINE FIELD OVERWRITE matrix ON battle TYPE record<matrix> DEFAULT ALWAYS
		(SELECT VALUE id FROM matrix ORDER BY created)[$];
	DEFINE FIELD OVERWRITE rounds ON battle TYPE array<array<int, 2>>;
		DEFINE FIELD OVERWRITE rounds.*.* ON battle TYPE int
			ASSERT $value IN [0, 1];
	DEFINE FIELD OVERWRITE errors ON battle TYPE array<option<string>, 2>;
	DEFINE FIELD OVERWRITE scores ON battle TYPE array<float, 2> COMPUTED {
		LET $initialMatrix = fn::initialMatrix();
		LET $T = $initialMatrix[1][0];
		LET $S = $initialMatrix[0][1];

		LET $errors = $this.errors;
		LET $e0 = $errors[0] != NONE;
		LET $e1 = $errors[1] != NONE;

		# Punish bots for errors
		IF $e0 AND $e1 {
			RETURN [$S, $S];
		} ELSE IF $e0 {
			RETURN [$S, $T];
		} ELSE IF $e1 {
			RETURN [$T, $S];
		};

		LET $payoff = (SELECT VALUE payoff FROM ONLY $this.matrix);
		LET $pts = $this.rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);
		LET $c = <float> count($pts);
		[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
	};
	DEFINE FIELD OVERWRITE eloDelta ON battle TYPE array<float, 2> DEFAULT {
		LET $K = <float> 32;
		LET $rating0 = (SELECT VALUE elo FROM ONLY $this.bots[0]);
		LET $rating1 = (SELECT VALUE elo FROM ONLY $this.bots[1]);
		LET $expected0 = 1.0 / (1.0 + math::pow(10.0, ($rating1 - $rating0) / 400.0));
		LET $expected1 = 1.0 - $expected0;

		LET $initialMatrix = fn::initialMatrix();
		LET $T = $initialMatrix[1][0];
		LET $S = $initialMatrix[0][1];
		LET $errors = $this.errors;
		LET $e0 = $errors[0] != NONE;
		LET $e1 = $errors[1] != NONE;
		LET $scores = IF $e0 AND $e1 {
			[$S, $S]
		} ELSE IF $e0 {
			[$S, $T]
		} ELSE IF $e1 {
			[$T, $S]
		} ELSE {
			LET $payoff = fn::initialMatrix();
			LET $pts = $this.rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);
			LET $c = <float> count($pts);
			[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c]
		};
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

-- DEFINE TABLE OVERWRITE hourSubmission SCHEMAFULL TYPE NORMAL;
-- 	DEFINE FIELD OVERWRITE id ON hourSubmission TYPE string;
-- 	DEFINE FIELD OVERWRITE owner ON hourSubmission TYPE record<user>;
-- 	DEFINE FIELD OVERWRITE lapseIds ON hourSubmission TYPE array<string>;
-- 	DEFINE FIELD OVERWRITE hours ON hourSubmission TYPE float; # computed at review
-- 	DEFINE FIELD OVERWRITE status ON hourSubmission TYPE string DEFAULT "pending"; # pending|approved|rejected
-- 	DEFINE FIELD OVERWRITE reviewedBy ON hourSubmission TYPE option<record<user>>;
-- 	DEFINE FIELD OVERWRITE created ON hourSubmission TYPE datetime DEFAULT ALWAYS time::now();

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

DEFINE FUNCTION OVERWRITE fn::calculateScore() {};

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
	-- DEFINE FIELD OVERWRITE elo ON bot TYPE int COMPUTED
	-- 	(1000
	-- 		+ math::sum(SELECT VALUE eloDelta FROM $self->wonAgainst)
	-- 		- math::sum(SELECT VALUE eloDelta FROM $self<-wonAgainst));
	DEFINE FIELD OVERWRITE wins ON bot TYPE int COMPUTED count($self->wonAgainst);
	DEFINE FIELD OVERWRITE losses ON bot TYPE int COMPUTED count($self<-wonAgainst);
	-- DEFINE FIELD OVERWRITE battles ON bot TYPE int COMPUTED $self.wins + $self.losses;

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
		LET $R = $initialMatrix[0][0];
		LET $S = $initialMatrix[0][1];

		LET $errors = $this.errors;
		LET $e0 = $errors[0] != NONE;
		LET $e1 = $errors[1] != NONE;

		# Punish bots for errors
		IF $e0 AND $e1 {
			[$S, $S];
		} ELSE IF $e0 {
			[$S, $R];
		} ELSE IF $e1 {
			[$R, $S];
		} ELSE {
			LET $payoff = (SELECT VALUE payoff FROM ONLY $this.matrix);
			LET $pts = $this.rounds.map(|$r| [$payoff[$r[0]][$r[1]], $payoff[$r[1]][$r[0]]]);
			LET $c = <float> count($pts);
			[math::sum($pts.map(|$p| $p[0])) / $c, math::sum($pts.map(|$p| $p[1])) / $c];
		}
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

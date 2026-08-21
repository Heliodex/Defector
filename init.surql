DEFINE TABLE OVERWRITE created SCHEMAFULL TYPE RELATION FROM user TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON created TYPE string;

REMOVE TABLE matrix;
REMOVE TABLE bot;

DEFINE TABLE OVERWRITE matrix SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON matrix TYPE string;
	DEFINE FIELD OVERWRITE payoff ON matrix TYPE array<array<array<int, 2>, 2>, 2>;
	DEFINE FIELD OVERWRITE created ON matrix TYPE datetime DEFAULT ALWAYS time::now();

# T > R > P > S
# 2R > T + S

LET $T = 3;
LET $R = 2;
LET $P = 1;
LET $S = 0;

CREATE matrix CONTENT {
	payoff: [
		[[$R, $R], [$S, $T]],
		[[$T, $S], [$P, $P]],
	]
};

DEFINE FUNCTION OVERWRITE fn::calculateScore() {};

DEFINE TABLE OVERWRITE bot SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON bot TYPE string;
	DEFINE FIELD OVERWRITE name ON bot TYPE string;
	DEFINE FIELD OVERWRITE description ON bot TYPE string;
	DEFINE FIELD OVERWRITE code ON bot TYPE array<object> DEFAULT ALWAYS []
			ASSERT array::len($value) >= 1;
		DEFINE FIELD OVERWRITE code.*.content ON bot TYPE string; # transpiled JS
		DEFINE FIELD OVERWRITE code.*.updated ON bot TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE codeHash ON bot TYPE string VALUE
		crypto::sha256((SELECT VALUE content FROM $this.code ORDER BY updated)[$]);
	DEFINE FIELD OVERWRITE latestCode ON bot TYPE string VALUE
		(SELECT VALUE content FROM $this.code ORDER BY updated)[$];
	DEFINE FIELD OVERWRITE active ON bot TYPE bool DEFAULT ALWAYS false;
	DEFINE FIELD OVERWRITE created ON bot TYPE datetime DEFAULT ALWAYS time::now();
	-- DEFINE FIELD OVERWRITE elo ON bot TYPE int COMPUTED
	-- 	(1000
	-- 		+ math::sum(SELECT VALUE eloDelta FROM $self->wonAgainst)
	-- 		- math::sum(SELECT VALUE eloDelta FROM $self<-wonAgainst));
	DEFINE FIELD OVERWRITE wins ON bot TYPE int COMPUTED count($self->wonAgainst);
	DEFINE FIELD OVERWRITE losses ON bot TYPE int COMPUTED count($self<-wonAgainst);
	-- DEFINE FIELD OVERWRITE battles ON bot TYPE int COMPUTED $self.wins + $self.losses;

DEFINE TABLE OVERWRITE wonAgainst SCHEMAFULL TYPE RELATION FROM bot TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON wonAgainst TYPE string;
	DEFINE FIELD OVERWRITE rounds ON wonAgainst TYPE array<object>;
		DEFINE FIELD OVERWRITE rounds.*.moveWinner ON wonAgainst TYPE string;
		DEFINE FIELD OVERWRITE rounds.*.moveLoser ON wonAgainst TYPE string;
	-- DEFINE FIELD OVERWRITE scoreWinner ON wonAgainst COMPUTED
	-- DEFINE FIELD OVERWRITE scoreLoser ON wonAgainst COMPUTED
	DEFINE FIELD OVERWRITE matrix ON wonAgainst TYPE record<matrix> DEFAULT ALWAYS
		(SELECT VALUE id FROM matrix ORDER BY created)[$];
	DEFINE FIELD OVERWRITE created ON wonAgainst TYPE datetime DEFAULT ALWAYS time::now();


DEFINE TABLE OVERWRITE hourSubmission SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE owner ON hourSubmission TYPE record<user>;
	DEFINE FIELD OVERWRITE lapseIds ON hourSubmission TYPE array<string>;
	DEFINE FIELD OVERWRITE hours ON hourSubmission TYPE float; # computed at review
	DEFINE FIELD OVERWRITE status ON hourSubmission TYPE string DEFAULT "pending"; # pending|approved|rejected
	DEFINE FIELD OVERWRITE reviewedBy ON hourSubmission TYPE option<record<user>>;
	DEFINE FIELD OVERWRITE created ON hourSubmission TYPE datetime DEFAULT ALWAYS time::now();

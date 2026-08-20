DEFINE TABLE OVERWRITE created SCHEMAFULL TYPE RELATION FROM user TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON created TYPE string;

DEFINE TABLE OVERWRITE bot SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON bot TYPE string;
	DEFINE FIELD OVERWRITE name ON bot TYPE string;
	DEFINE FIELD OVERWRITE description ON bot TYPE string;
	DEFINE FIELD OVERWRITE code ON bot TYPE string; # normalised source (transpiled JS)
	DEFINE FIELD OVERWRITE codeHash ON bot TYPE string; # sha256 for dedup
	DEFINE FIELD OVERWRITE active ON bot TYPE bool DEFAULT ALWAYS false;
	DEFINE FIELD OVERWRITE created ON bot TYPE datetime DEFAULT ALWAYS time::now();
	DEFINE FIELD OVERWRITE elo ON bot COMPUTED
		(1000
			+ SELECT (eloGainWinner) FROM $self->wonAgainst
			- SELECT (eloLossLoser) FROM $self<-wonAgainst);
	DEFINE FIELD OVERWRITE wins ON bot TYPE int DEFAULT ALWAYS 0;
	DEFINE FIELD OVERWRITE losses ON bot TYPE int DEFAULT ALWAYS 0;
	DEFINE FIELD OVERWRITE draws ON bot TYPE int DEFAULT ALWAYS 0;
	DEFINE FIELD OVERWRITE battles ON bot TYPE int DEFAULT ALWAYS 0; # total matches

DEFINE TABLE OVERWRITE wonAgainst SCHEMAFULL TYPE RELATION FROM bot TO bot ENFORCED;
	DEFINE FIELD OVERWRITE id ON wonAgainst TYPE string;
	DEFINE FIELD OVERWRITE rounds ON wonAgainst TYPE array<object>;
		DEFINE FIELD OVERWRITE rounds.*.moveWinner ON wonAgainst TYPE string;
		DEFINE FIELD OVERWRITE rounds.*.moveLoser ON wonAgainst TYPE string;
	-- DEFINE FIELD OVERWRITE scoreWinner ON wonAgainst COMPUTED
	-- DEFINE FIELD OVERWRITE scoreLoser ON wonAgainst COMPUTED
	DEFINE FIELD OVERWRITE eloWinner ON wonAgainst TYPE int;
	DEFINE FIELD OVERWRITE eloLoser ON wonAgainst TYPE int;
	DEFINE FIELD OVERWRITE eloGainWinner ON wonAgainst TYPE int; # for sparkline
	DEFINE FIELD OVERWRITE eloLossLoser ON wonAgainst TYPE int;
	DEFINE FIELD OVERWRITE created ON wonAgainst TYPE datetime DEFAULT ALWAYS time::now();

DEFINE TABLE OVERWRITE hourSubmission SCHEMAFULL TYPE NORMAL;
	DEFINE FIELD OVERWRITE id ON hourSubmission TYPE string;
	DEFINE FIELD OVERWRITE owner ON hourSubmission TYPE record<user>;
	DEFINE FIELD OVERWRITE lapseIds ON hourSubmission TYPE array<string>;
	DEFINE FIELD OVERWRITE hours ON hourSubmission TYPE float; # computed at review
	DEFINE FIELD OVERWRITE status ON hourSubmission TYPE string DEFAULT "pending"; # pending|approved|rejected
	DEFINE FIELD OVERWRITE reviewedBy ON hourSubmission TYPE option<record<user>>;
	DEFINE FIELD OVERWRITE created ON hourSubmission TYPE datetime DEFAULT ALWAYS time::now();

IF count(SELECT 1 FROM bot WHERE active) <= 1 {
	THROW "Not enough bots to play";
};

LET $bot1 = (SELECT codeHash, latestCode, name FROM bot
	WHERE active ORDER BY rand() LIMIT 1)[0];
LET $bot2 = (SELECT codeHash, latestCode, name FROM bot
	WHERE active AND id != $bot1.id ORDER BY rand() LIMIT 1)[0];

[$bot1, $bot2];

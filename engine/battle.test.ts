import { expect, test } from "bun:test"
import { RecordId } from "surrealdb"
import { type DBBot, simulateBattle } from "./runner"

/** Transpiles a sample bot from ./bots into a runnable DBBot. */
async function loadBot(name: string): Promise<DBBot> {
	const source = await Bun.file(`./bots/${name}.ts`).text()
	const latestCode = new Bun.Transpiler({ loader: "ts" }).transformSync(
		source
	)

	return {
		id: new RecordId("bot", name),
		codeHash: "",
		latestCode,
		name,
	}
}

test("always-cooperate vs always-defect: C never beats D", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("alwaysCooperate"),
		await loadBot("alwaysDefect"),
	])

	expect(errors).toEqual([undefined, undefined])
	// Battles run a variable number of rounds, always at least 100.
	expect(rounds.length).toBeGreaterThanOrEqual(100)
	// C plays 0, D plays 1 for every single round.
	expect(rounds.every(([you, opp]) => you === "C" && opp === "D")).toBe(true)
})

test("always-cooperate vs tit-for-tat: both cooperate forever", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("alwaysCooperate"),
		await loadBot("titForTat"),
	])

	expect(errors).toEqual([undefined, undefined])
	// Battles run a variable number of rounds, always at least 100.
	expect(rounds.length).toBeGreaterThanOrEqual(100)
	expect(rounds.every(([you, opp]) => you === "C" && opp === "C")).toBe(true)
})

test("tit-for-tat punishes a defector after one cooperative round", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("titForTat"),
		await loadBot("alwaysDefect"),
	])

	expect(errors).toEqual([undefined, undefined])
	// Battles run a variable number of rounds, always at least 100.
	expect(rounds.length).toBeGreaterThanOrEqual(100)
	// Round 0: TFT cooperates, always-defect defects.
	expect(rounds[0]).toEqual(["C", "D"])
	// Every round after: TFT retaliates and both defect.
	expect(
		rounds.slice(1).every(([you, opp]) => you === "D" && opp === "D")
	).toBe(true)
})

test("two random bots battle without crashing", async () => {
	const names = (await Array.fromAsync(new Bun.Glob("*.ts").scan("./bots")))
		.map(file => file.replace(/\.ts$/, ""))
		.filter(name => name !== "alwaysErrors") // covered by its own test

	// Pick two distinct bots at random, like the tournament does.
	const shuffled = names.sort(() => Math.random() - 0.5)
	const [a, b] = shuffled
	if (!a || !b) throw new Error("Not enough sample bots to run a battle")

	// Saboteur bots (cpuWaster, invalidReturn…) can throw while their VM is disposed after an interrupt — that's contained engine behaviour, not a test failure.
	let error: unknown
	let result: Awaited<ReturnType<typeof simulateBattle>> | undefined
	try {
		result = await simulateBattle([await loadBot(a), await loadBot(b)])
	} catch (e) {
		error = e
	}

	if (error) {
		expect((error as Error).message).toMatch(
			/maximum (execution time|stack size|memory limit)|bot error|Aborted/
		)
		return
	}

	if (!result) throw new Error("simulateBattle returned no result")

	const { rounds, errors } = result

	if (errors.some(error => error !== undefined)) {
		// A saboteur was picked; its error must stop the battle early
		expect(rounds.length).toBeLessThan(100)
		return
	}

	// Battles run a variable number of rounds, always at least 100.
	expect(rounds.length).toBeGreaterThanOrEqual(100)
})

test("a bot that throws records an error instead of a move", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("alwaysErrors"),
		await loadBot("alwaysCooperate"),
	])

	expect(rounds).toHaveLength(0)
	expect(errors[0]).toBeDefined()
	expect(errors[1]).toBeUndefined()
})

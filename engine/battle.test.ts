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
	expect(rounds).toHaveLength(100)
	// C plays 0, D plays 1 for every single round.
	expect(rounds).toEqual(Array(100).fill(["C", "D"]))
})

test("always-cooperate vs tit-for-tat: both cooperate forever", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("alwaysCooperate"),
		await loadBot("titForTat"),
	])

	expect(errors).toEqual([undefined, undefined])
	expect(rounds).toHaveLength(100)
	expect(rounds).toEqual(Array(100).fill(["C", "C"]))
})

test("tit-for-tat punishes a defector after one cooperative round", async () => {
	const { rounds, errors } = await simulateBattle([
		await loadBot("titForTat"),
		await loadBot("alwaysDefect"),
	])

	expect(errors).toEqual([undefined, undefined])
	expect(rounds).toHaveLength(100)
	// Round 0: TFT cooperates, always-defect defects.
	expect(rounds[0]).toEqual(["C", "D"])
	// Rounds 1-99: TFT retaliates and both defect.
	expect(rounds.slice(1)).toEqual(Array(99).fill(["D", "D"]))
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

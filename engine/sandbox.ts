import quickjsVariant from "@jitl/quickjs-ng-wasmfile-release-sync"
import { loadQuickJs } from "@sebastianwessel/quickjs"
import type { QuickJSContext } from "quickjs-emscripten-core"
import type { RecordId } from "surrealdb"
import type { Memory, Move, State } from "./bots/bot"

export const timeout = 10 // ms per move
export const memoryLimitMb = 1
export const stackLimitMb = 1

const { runSandboxed } = await loadQuickJs(quickjsVariant)

type DBBot = { id: RecordId<"bot">; name: string; latestCode: string }

class InvalidResponseError extends Error {}

const runBot =
	(bot: DBBot, state: State) =>
	async ({ ctx }: { ctx: QuickJSContext }) => {
		const moduleHandle = ctx.unwrapResult(
			ctx.evalCode(bot.latestCode, `${bot.name}.js`, {
				type: "module",
			})
		)
		const botHandle = ctx.getProp(moduleHandle, "default")
		const stateHandle = ctx.unwrapResult(
			ctx.evalCode(`(${JSON.stringify(state)})`, "state.js")
		)

		try {
			const outputHandle = ctx.unwrapResult(
				ctx.callFunction(botHandle, ctx.undefined, stateHandle)
			)
			try {
				const output = ctx.dump(outputHandle)
				if (!Array.isArray(output) || output.length !== 2)
					throw new InvalidResponseError(
						`must return a [move, memory] tuple, instead got ${JSON.stringify(output)}`
					)
				if (output[0] !== "C" && output[0] !== "D")
					throw new InvalidResponseError(
						`returned invalid move ${JSON.stringify(output[0])}`
					)

				return output as [Move, Memory]
			} finally {
				outputHandle.dispose()
			}
		} finally {
			stateHandle.dispose()
			botHandle.dispose()
			moduleHandle.dispose()
		}
	}

/**
 * Runs a single bot against a given state inside the sandbox, enforcing the
 * move timeout, memory and stack limits. Throws on invalid moves/timeouts.
 */
export async function callBot(
	bot: DBBot,
	state: State
): Promise<[Move, Memory]> {
	try {
		const res = await runSandboxed(runBot(bot, state), {
			executionTimeout: timeout,
			memoryLimit: memoryLimitMb * 1e6,
			maxStackSize: stackLimitMb * 1e6,
		})

		return res
	} catch (error) {
		if (!(error instanceof Error)) throw error

		if (error.message.includes("list_empty(&rt->gc_obj_list)"))
			throw new Error(`maximum stack size of ${stackLimitMb} MB exceeded`)

		switch (error.message) {
			case "out of memory":
				throw new Error(
					`maximum memory limit of ${memoryLimitMb} MB exceeded`
				)
			case "interrupted":
				throw new Error(
					`maximum execution time of ${timeout} ms exceeded`
				)
		}

		if (error instanceof InvalidResponseError) throw error

		throw new Error(`bot error: ${error.message}`)
	}
}

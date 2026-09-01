import quickjsVariant from "@jitl/quickjs-ng-wasmfile-release-sync"
import { loadQuickJs } from "@sebastianwessel/quickjs"
import { shouldInterruptAfterDeadline } from "quickjs-emscripten-core"
import type { RecordId } from "surrealdb"
import type { Memory, Move, State } from "./bots/bot"

export const timeout = 10 // ms per move
export const memoryLimitMb = 1
export const stackLimitMb = 1

const { module } = await loadQuickJs(quickjsVariant)

type DBBot = { id: RecordId<"bot">; name: string; latestCode: string }

class InvalidResponseError extends Error {}

/**
 * A bot loaded into its own persistent QuickJS sandbox. The VM and the bot's module are created once and reused for every move of a battle, so each move only pays for a single function call instead of a full runtime startup.
 */
export type SandboxedBot = {
	/** Runs a single move. Throws on invalid moves, timeouts or crashes. */
	call(state: State): [Move, Memory]
	/** Frees the VM. The bot must not be used afterwards. */
	dispose(): void
}

function mapSandboxError(error: unknown): Error {
	if (!(error instanceof Error)) return new Error(`bot error: ${error}`)

	if (error.message.includes("list_empty(&rt->gc_obj_list)"))
		return new Error(`maximum stack size of ${stackLimitMb} MB exceeded`)

	switch (error.message) {
		case "out of memory":
			return new Error(
				`maximum memory limit of ${memoryLimitMb} MB exceeded`
			)
		case "interrupted":
			return new Error(`maximum execution time of ${timeout} ms exceeded`)
	}

	if (error instanceof InvalidResponseError) return error

	return new Error(`bot error: ${error.message}`)
}

/**
 * Loads a bot into a fresh sandboxed QuickJS VM, enforcing the memory and stack limits. The per-move execution timeout is re-armed on every call.
 */
export async function createSandboxedBot(bot: DBBot): Promise<SandboxedBot> {
	const ctx = module.newContext()
	ctx.runtime.setMaxStackSize(stackLimitMb * 1e6)
	ctx.runtime.setMemoryLimit(memoryLimitMb * 1e6)

	const moduleHandle = ctx.unwrapResult(
		ctx.evalCode(bot.latestCode, `${bot.name}.js`, {
			type: "module",
		})
	)
	// Module evaluation is scheduled as a pending job — run it now so the module's default export actually exists.
	ctx.runtime.executePendingJobs()
	const botHandle = ctx.getProp(moduleHandle, "default")
	moduleHandle.dispose()

	const call = (state: State): [Move, Memory] => {
		ctx.runtime.setInterruptHandler(
			shouldInterruptAfterDeadline(Date.now() + timeout)
		)

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
		}
	}

	return {
		call: state => {
			try {
				return call(state)
			} catch (error) {
				throw mapSandboxError(error)
			}
		},
		dispose: () => {
			botHandle.dispose()
			// ctx.dispose() also frees the underlying runtime
			ctx.dispose()
		},
	}
}

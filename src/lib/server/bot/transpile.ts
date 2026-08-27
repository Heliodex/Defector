/**
 * Compiles a bot's TypeScript/JavaScript source down to plain JS that the engine's sandbox can execute. Throws if transpilation fails.
 */
export function transpileBot(code: string): string {
	const out = new Bun.Transpiler({ loader: "ts" }).transformSync(code)
	const result =
		typeof out === "string" ? out : (out as { code?: string }).code
	if (typeof result !== "string" || result.length === 0)
		throw new Error("Could not transpile your bot code")

	return result
}

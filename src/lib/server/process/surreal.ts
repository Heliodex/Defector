let started = false

async function isLockHeldByLivingProcess(): Promise<boolean> {
	try {
		const pid = Number.parseInt(
			(await Bun.file("data/surreal/LOCK").text()).trim(),
			10
		)
		if (!Number.isFinite(pid)) return false

		try {
			process.kill(pid, 0)
			return true
		} catch (err) {
			// EPERM: the process exists but belongs to another user
			return (err as NodeJS.ErrnoException).code === "EPERM"
		}
	} catch {
		// No lock file — this is the first start
		return false
	}
}

export default async () => {
	if (started) return
	if (await isLockHeldByLivingProcess()) {
		console.log("SurrealDB is already running — skipping start.")
		return
	}
	console.log("Starting SurrealDB...")
	started = true

	try {
		const proc = Bun.spawn(
			[
				"surreal",
				"start",
				"-u=root",
				"-p=root",
				"-b=127.0.0.1:8003",
				"surrealkv://data/surreal",
			],
			{ cwd: ".", stdout: "pipe", stderr: "pipe" }
		)

		process.on("exit", () => {
			console.log("Shutting down SurrealDB...")
			proc.kill()
		})

		proc.exited.then(async () => {
			console.error("SurrealDB process exited unexpectedly.")
			const r = await proc.stderr.getReader().read()
			const logs = new TextDecoder().decode(r.value)
			console.log(logs.split("\n").slice(-10).join("\n"))
			process.exit(1)
		})
	} catch (e) {
		console.error(e)
		console.error(
			"Failed to start SurrealDB. Make sure `surreal` is installed and on PATH."
		)
		process.exit(1)
	}
}

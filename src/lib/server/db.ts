import {
	BoundQuery,
	type Query, // Using despite the fact it's not exported, don't worry about it
	Surreal,
	RecordId as SurrealRecordId,
	Table,
} from "surrealdb"
import initQuery from "#lib/server/init.surql?raw"

export const db = new Surreal({
	codecOptions: {
		useNativeDates: true,
	},
})

// Retry queries
const ogq = db.query.bind(db)

const retriable = "This transaction can be retried"

// oof
// though better types now
db.query = async <R extends unknown[] = unknown[]>(
	query: BoundQuery<any> | string,
	bindings?: Record<string, unknown>
): Query<R, false> => {
	if (query instanceof BoundQuery)
		throw new Error("bound queries unsupported") // bruh

	try {
		return await ogq(query, bindings)
	} catch (err) {
		const e = err as Error
		if (!e.message.endsWith(retriable)) throw e
		console.log("Retrying query:", e.message)
	}

	return await db.query(query, bindings)
}

export const version = db.version.bind(db)

const url = new URL(process.env.SURREAL_URL ?? "ws://localhost:8002") // must be ws:// to prevent token expiration, http:// will expire after 1 hour by default

export async function reconnect() {
	for (let attempt = 0; ; attempt++)
		try {
			await db.close() // doesn't do anything if not connected
			console.log("connecting to database")
			await db.connect(url, {
				namespace: "main",
				database: "main",
				authentication: {
					username: "root", // security B)
					password: "root",
				},
			})

			console.log("reloaded", (await version()).version)

			break
		} catch (err) {
			const e = err as Error

			console.error("Failed to connect to database:", e.message)

			if (attempt === 4)
				console.log(
					`Multiple connection attempts failed. Make sure the database is running, either locally or in a container, and is accessible at ${url}.`
				)

			console.log("Retrying connection in 1 second...")
			await new Promise(resolve => setTimeout(resolve, 1000))
		}

	await db.query(initQuery)
}

type RecordIdTypes = {
	createdProject: string
	hasSession: string
	project: string
	session: string
	user: string
}

export const CreatedProject = new Table("createdProject")
export const HasSession = new Table("hasSession")
export const Project = new Table("project")
export const Session = new Table("session")
export const User = new Table("user")

// Ensure type safety when creating record ids
export type RecordId<T extends keyof RecordIdTypes> = SurrealRecordId<T>

/**
 * Returns a record id object for a given table and id.
 * @param table The table to get the record id for.
 * @param id The id of the record.
 * @returns a Record object.
 */
export const Record = <T extends keyof RecordIdTypes>(
	table: T,
	id: RecordIdTypes[T]
) => new SurrealRecordId(table, id)

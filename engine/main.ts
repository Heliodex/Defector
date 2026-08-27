import { db, reconnect } from "./db"
import { start } from "./server"

// The engine connects to the database started by the site. It does not start its own SurrealDB instance. Once connected it runs battles continuously.
await reconnect()

await start(db)

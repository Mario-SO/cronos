import { Database } from "bun:sqlite";
import { Effect, Schedule } from "effect";
import { ensureDatabaseDir, getDatabasePath } from "./config";
import { runMigrations } from "./migrations";

let db: Database | null = null;

/**
 * Get the database instance.
 * Throws if the database hasn't been initialized.
 */
export function getDatabase(): Database {
	if (!db) {
		throw new Error("Database not initialized. Call initDatabase() first.");
	}
	return db;
}

/**
 * Initialize the database connection and run migrations.
 * Should be called once at app startup before any database operations.
 */
export function initDatabase(): void {
	if (db) {
		return; // Already initialized
	}

	const dbPath = getDatabasePath();
	ensureDatabaseDir(dbPath);

	db = new Database(dbPath, { create: true });

	// Enable WAL mode for better concurrent read performance
	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA busy_timeout = 5000");

	// Run any pending migrations
	runMigrations(db);
}

const SQLITE_BUSY_RETRY_LIMIT = 5;
const SQLITE_BUSY_RETRY_BASE_DELAY = "50 millis";

function isSqliteBusyError(error: unknown): boolean {
	if (!error) return false;
	if (error instanceof Error && error.message.includes("SQLITE_BUSY")) {
		return true;
	}
	if (typeof error === "object" && "code" in error) {
		return (error as { code?: string }).code === "SQLITE_BUSY";
	}
	return false;
}

const sqliteBusyRetrySchedule = Schedule.recurWhile(isSqliteBusyError).pipe(
	Schedule.intersect(Schedule.exponential(SQLITE_BUSY_RETRY_BASE_DELAY)),
	Schedule.intersect(Schedule.recurs(SQLITE_BUSY_RETRY_LIMIT)),
);

export function withDbWrite<A>(
	run: (db: Database) => A,
): Effect.Effect<A, Error> {
	return Effect.retry(
		Effect.try({
			try: () => run(getDatabase()),
			catch: (error) =>
				error instanceof Error ? error : new Error(String(error)),
		}),
		sqliteBusyRetrySchedule,
	);
}

/**
 * Close the database connection.
 * Useful for cleanup in tests or graceful shutdown.
 */
export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
	}
}

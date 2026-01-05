import type { Database } from "bun:sqlite";

interface Migration {
	version: number;
	up: (db: Database) => void;
}

/**
 * All database migrations in order.
 * Each migration should be idempotent (safe to run multiple times).
 */
const MIGRATIONS: Migration[] = [
	{
		version: 1,
		up: (db) => {
			// Create events table
			db.run(`
				CREATE TABLE IF NOT EXISTS events (
					id TEXT PRIMARY KEY,
					date TEXT NOT NULL,
					title TEXT NOT NULL,
					start_time INTEGER,
					end_time INTEGER,
					color TEXT NOT NULL DEFAULT 'gray',
					created_at TEXT DEFAULT (datetime('now')),
					updated_at TEXT DEFAULT (datetime('now'))
				)
			`);

			// Create index for date lookups
			db.run(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`);

			// Create schema version table
			db.run(`
				CREATE TABLE IF NOT EXISTS schema_version (
					version INTEGER PRIMARY KEY
				)
			`);
		},
	},
	// Future migrations go here:
	// { version: 2, up: (db) => { /* add recurring events */ } },
];

/**
 * Get the current schema version from the database.
 * Returns 0 if no version is set (fresh database).
 */
function getCurrentVersion(db: Database): number {
	try {
		const result = db
			.query("SELECT MAX(version) as version FROM schema_version")
			.get() as { version: number | null } | null;
		return result?.version ?? 0;
	} catch {
		// Table doesn't exist yet
		return 0;
	}
}

/**
 * Run all pending migrations on the database.
 * Migrations are run in a transaction for safety.
 */
export function runMigrations(db: Database): void {
	const currentVersion = getCurrentVersion(db);
	const pendingMigrations = MIGRATIONS.filter(
		(m) => m.version > currentVersion,
	);

	if (pendingMigrations.length === 0) {
		return;
	}

	// Run each migration in its own transaction
	for (const migration of pendingMigrations) {
		db.transaction(() => {
			migration.up(db);
			db.run("INSERT OR REPLACE INTO schema_version (version) VALUES (?)", [
				migration.version,
			]);
		})();
	}
}

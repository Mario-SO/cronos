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
	{
		version: 2,
		up: (db) => {
			const eventColumns = db.query("PRAGMA table_info(events)").all() as {
				name: string;
			}[];
			const eventColumnSet = new Set(eventColumns.map((col) => col.name));
			if (!eventColumnSet.has("google_event_id")) {
				db.run("ALTER TABLE events ADD COLUMN google_event_id TEXT");
			}
			if (!eventColumnSet.has("google_calendar_id")) {
				db.run("ALTER TABLE events ADD COLUMN google_calendar_id TEXT");
			}
			if (!eventColumnSet.has("google_etag")) {
				db.run("ALTER TABLE events ADD COLUMN google_etag TEXT");
			}

			db.run(`
				CREATE TABLE IF NOT EXISTS google_calendars (
					calendar_id TEXT PRIMARY KEY,
					summary TEXT NOT NULL,
					color TEXT NOT NULL DEFAULT 'gray',
					enabled INTEGER NOT NULL DEFAULT 1,
					can_write INTEGER NOT NULL DEFAULT 1,
					sync_token TEXT,
					last_sync_at TEXT,
					updated_at TEXT DEFAULT (datetime('now'))
				)
			`);

			db.run(`
				CREATE TABLE IF NOT EXISTS google_event_deletions (
					calendar_id TEXT NOT NULL,
					event_id TEXT NOT NULL,
					deleted_at TEXT NOT NULL,
					PRIMARY KEY (calendar_id, event_id)
				)
			`);

			db.run(
				"CREATE INDEX IF NOT EXISTS idx_events_google ON events(google_calendar_id, google_event_id)",
			);
		},
	},
	{
		version: 3,
		up: (db) => {
			const calendarColumns = db
				.query("PRAGMA table_info(google_calendars)")
				.all() as {
				name: string;
			}[];
			const calendarColumnSet = new Set(calendarColumns.map((col) => col.name));
			if (!calendarColumnSet.has("can_write")) {
				db.run(
					"ALTER TABLE google_calendars ADD COLUMN can_write INTEGER NOT NULL DEFAULT 1",
				);
			}
		},
	},
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

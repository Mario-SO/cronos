import { Database } from "bun:sqlite";
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

	// Run any pending migrations
	runMigrations(db);
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

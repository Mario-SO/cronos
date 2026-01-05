import { mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

/**
 * Get the platform-specific data directory for storing application data.
 * - macOS: ~/Library/Application Support/cronos
 * - Linux: ~/.local/share/cronos
 * - Windows: %APPDATA%/cronos (fallback)
 */
function getDefaultDataDir(): string {
	const home = homedir();
	const os = platform();

	switch (os) {
		case "darwin":
			return join(home, ".config", "cronos");
		case "win32":
			return join(
				process.env.APPDATA ?? join(home, "AppData", "Roaming"),
				"cronos",
			);
		default:
			// Linux and others follow XDG Base Directory spec
			return join(
				process.env.XDG_DATA_HOME ?? join(home, ".local", "share"),
				"cronos",
			);
	}
}

/**
 * Get the database file path.
 * - Uses CRONOS_DB_PATH environment variable if set
 * - Falls back to platform-specific data directory
 */
export function getDatabasePath(): string {
	const envPath = process.env.CRONOS_DB_PATH;
	if (envPath) {
		return envPath;
	}

	return join(getDefaultDataDir(), "events.db");
}

/**
 * Ensure the directory for the database file exists.
 */
export function ensureDatabaseDir(dbPath: string): void {
	const dir = dirname(dbPath);
	mkdirSync(dir, { recursive: true });
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Settings, ThemeId, WeekStartDay } from "@core/types";
import { getDefaultDataDir } from "@db/config";
import { DEFAULT_THEME_ID } from "./themes";

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
	version: SETTINGS_VERSION,
	weekStartDay: "monday",
	notificationsEnabled: true,
	notificationLeadMinutes: 10,
	themeId: DEFAULT_THEME_ID,
};

function isWeekStartDay(value: unknown): value is WeekStartDay {
	return value === "monday" || value === "sunday";
}

function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

function normalizeNotificationMinutes(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_SETTINGS.notificationLeadMinutes;
	}
	const rounded = Math.round(value);
	if (rounded < 1 || rounded > 1440) {
		return DEFAULT_SETTINGS.notificationLeadMinutes;
	}
	return rounded;
}

function normalizeThemeId(value: unknown): ThemeId {
	if (typeof value !== "string" || value.trim().length === 0) {
		return DEFAULT_SETTINGS.themeId;
	}
	return value;
}

export function getSettingsPath(): string {
	const envPath = process.env.CRONOS_SETTINGS_PATH;
	if (envPath) {
		return envPath;
	}

	return join(getDefaultDataDir(), "settings.json");
}

export function ensureSettingsDir(settingsPath: string): void {
	const dir = dirname(settingsPath);
	mkdirSync(dir, { recursive: true });
}

export function normalizeSettings(raw: Partial<Settings>): Settings {
	const weekStartDay = isWeekStartDay(raw.weekStartDay)
		? raw.weekStartDay
		: DEFAULT_SETTINGS.weekStartDay;
	const notificationsEnabled = isBoolean(raw.notificationsEnabled)
		? raw.notificationsEnabled
		: DEFAULT_SETTINGS.notificationsEnabled;
	const notificationLeadMinutes = normalizeNotificationMinutes(
		raw.notificationLeadMinutes,
	);
	const themeId = normalizeThemeId(raw.themeId);

	return {
		version: SETTINGS_VERSION,
		weekStartDay,
		notificationsEnabled,
		notificationLeadMinutes,
		themeId,
	};
}

export function loadSettings(): Settings {
	const settingsPath = getSettingsPath();

	if (!existsSync(settingsPath)) {
		ensureSettingsDir(settingsPath);
		saveSettings(DEFAULT_SETTINGS);
		return DEFAULT_SETTINGS;
	}

	try {
		const raw = JSON.parse(
			readFileSync(settingsPath, "utf8"),
		) as Partial<Settings>;
		const normalized = normalizeSettings(raw ?? {});
		if (normalized.version !== raw?.version) {
			saveSettings(normalized);
		}
		return normalized;
	} catch {
		saveSettings(DEFAULT_SETTINGS);
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(settings: Settings): void {
	const settingsPath = getSettingsPath();
	ensureSettingsDir(settingsPath);
	writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

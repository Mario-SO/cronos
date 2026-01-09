import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ColorName, ThemeId } from "@shared/types";
import { getDefaultDataDir } from "@data/config";
import type { TerminalColors } from "@opentui/core";
import { COLOR_NAMES } from "./colors";

export type ThemeUi = {
	background: string;
	backgroundAlt: string;
	backgroundDark: string;
	selection: string;
	foreground: string;
	foregroundDim: string;
	border: string;
	borderHighlight: string;
	today: string;
	selected: string;
	cursor: string;
	error: string;
	warning: string;
	success: string;
	info: string;
	accent: string;
	accentAlt: string;
	cyan: string;
};

export type ThemePalette = {
	ui: ThemeUi;
	eventColors: Record<ColorName, string>;
};

export type ThemeOption = {
	id: ThemeId;
	label: string;
};

export type ThemeConfig = {
	version: number;
	themes: Record<ThemeId, ThemePalette>;
};

export const THEME_VERSION = 1;
export const DEFAULT_THEME_ID = "cursor-dark";
export const ANSI_THEME_ID = "ansi";

const CURSOR_DARK: ThemePalette = {
	ui: {
		background: "#141414",
		backgroundAlt: "#1F1F1F",
		backgroundDark: "#2A2A2A",
		selection: "#2E2E2E",
		foreground: "#D8DEE9",
		foregroundDim: "#505050",
		border: "#2A2A2A",
		borderHighlight: "#87C3FF",
		today: "#A3BE8C",
		selected: "#85C1FC",
		cursor: "#87C3FF",
		error: "#BF616A",
		warning: "#EBC88D",
		success: "#A3BE8C",
		info: "#88C0D0",
		accent: "#AA9BF5",
		accentAlt: "#C582BF",
		cyan: "#83D6C5",
	},
	eventColors: {
		gray: "#505050",
		blue: "#85C1FC",
		green: "#A3BE8C",
		red: "#BF616A",
		yellow: "#EBC88D",
		purple: "#AA9BF5",
		orange: "#EFB080",
	},
};

const CURSOR_LIGHT: ThemePalette = {
	ui: {
		background: "#FCFCFC",
		backgroundAlt: "#F3F3F3",
		backgroundDark: "#EDEDED",
		selection: "#ECECEC",
		foreground: "#141414",
		foregroundDim: "#6A6A6A",
		border: "#E6E6E6",
		borderHighlight: "#DADADA",
		today: "#55A583",
		selected: "#3C7CAB",
		cursor: "#206595",
		error: "#CF2D56",
		warning: "#C08532",
		success: "#55A583",
		info: "#6F9BA6",
		accent: "#9E94D5",
		accentAlt: "#D06BA6",
		cyan: "#4C7F8C",
	},
	eventColors: {
		gray: "#6A6A6A",
		blue: "#6299C3",
		green: "#55A583",
		red: "#CF2D56",
		yellow: "#C08532",
		purple: "#9E94D5",
		orange: "#DB704B",
	},
};

export const BUILTIN_THEMES: Record<ThemeId, ThemePalette> = {
	"cursor-dark": CURSOR_DARK,
	"cursor-light": CURSOR_LIGHT,
};

const BUILTIN_THEME_OPTIONS: ThemeOption[] = [
	{ id: "cursor-dark", label: "Cursor Dark" },
	{ id: "cursor-light", label: "Cursor Light" },
	{ id: ANSI_THEME_ID, label: "Terminal (ANSI)" },
];

const UI_KEYS: Array<keyof ThemeUi> = [
	"background",
	"backgroundAlt",
	"backgroundDark",
	"selection",
	"foreground",
	"foregroundDim",
	"border",
	"borderHighlight",
	"today",
	"selected",
	"cursor",
	"error",
	"warning",
	"success",
	"info",
	"accent",
	"accentAlt",
	"cyan",
];

function toTitleCase(value: string): string {
	return value
		.replace(/[-_]+/g, " ")
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join(" ");
}

function normalizeThemePalette(
	raw: Partial<ThemePalette>,
	base: ThemePalette,
): ThemePalette {
	const ui = { ...base.ui };
	if (raw.ui) {
		for (const key of UI_KEYS) {
			const value = raw.ui[key];
			if (typeof value === "string" && value.length > 0) {
				ui[key] = value;
			}
		}
	}

	const eventColors = { ...base.eventColors };
	if (raw.eventColors) {
		for (const name of COLOR_NAMES) {
			const value = raw.eventColors[name];
			if (typeof value === "string" && value.length > 0) {
				eventColors[name] = value;
			}
		}
	}

	return { ui, eventColors };
}

function pickHex(value: string | null | undefined, fallback: string): string {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	return fallback;
}

function pickPalette(
	palette: TerminalColors,
	index: number,
	fallback: string,
): string {
	return pickHex(palette.palette[index] ?? null, fallback);
}

export function themeFromPalette(
	palette: TerminalColors,
	fallback: ThemePalette,
): ThemePalette {
	const background = pickHex(palette.defaultBackground, fallback.ui.background);
	const foreground = pickHex(palette.defaultForeground, fallback.ui.foreground);
	const backgroundAlt = pickPalette(palette, 8, fallback.ui.backgroundAlt);
	const backgroundDark = pickPalette(palette, 8, fallback.ui.backgroundDark);
	const selection = pickHex(palette.highlightBackground, fallback.ui.selection);
	const foregroundDim = pickPalette(palette, 8, fallback.ui.foregroundDim);
	const border = pickPalette(palette, 8, fallback.ui.border);
	const borderHighlight = pickPalette(palette, 4, fallback.ui.borderHighlight);
	const today = pickPalette(palette, 2, fallback.ui.today);
	const selected = pickPalette(palette, 4, fallback.ui.selected);
	const cursor = pickHex(palette.cursorColor, fallback.ui.cursor);
	const error = pickPalette(palette, 1, fallback.ui.error);
	const warning = pickPalette(palette, 3, fallback.ui.warning);
	const success = pickPalette(palette, 2, fallback.ui.success);
	const info = pickPalette(palette, 6, fallback.ui.info);
	const accent = pickPalette(palette, 5, fallback.ui.accent);
	const accentAlt = pickPalette(palette, 13, accent);
	const cyan = pickPalette(palette, 6, fallback.ui.cyan);

	return {
		ui: {
			background,
			backgroundAlt,
			backgroundDark,
			selection,
			foreground,
			foregroundDim,
			border,
			borderHighlight,
			today,
			selected,
			cursor,
			error,
			warning,
			success,
			info,
			accent,
			accentAlt,
			cyan,
		},
		eventColors: {
			gray: pickPalette(palette, 8, fallback.eventColors.gray),
			blue: pickPalette(palette, 4, fallback.eventColors.blue),
			green: pickPalette(palette, 2, fallback.eventColors.green),
			red: pickPalette(palette, 1, fallback.eventColors.red),
			yellow: pickPalette(palette, 3, fallback.eventColors.yellow),
			purple: pickPalette(palette, 5, fallback.eventColors.purple),
			orange: pickPalette(palette, 11, fallback.eventColors.orange),
		},
	};
}

export function getThemePath(): string {
	const envPath = process.env.CRONOS_THEME_PATH;
	if (envPath) {
		return envPath;
	}

	return join(getDefaultDataDir(), "theme.json");
}

export function normalizeThemeConfig(raw: unknown): ThemeConfig {
	if (!raw || typeof raw !== "object") {
		return { version: THEME_VERSION, themes: {} };
	}

	const record = raw as { version?: unknown; themes?: unknown };
	const themes: Record<ThemeId, ThemePalette> = {};
	const base = BUILTIN_THEMES[DEFAULT_THEME_ID] ?? CURSOR_DARK;

	if (record.themes && typeof record.themes === "object") {
		for (const [id, value] of Object.entries(
			record.themes as Record<string, Partial<ThemePalette>>,
		)) {
			if (!id) continue;
			themes[id] = normalizeThemePalette(value ?? {}, base);
		}
	}

	return {
		version: THEME_VERSION,
		themes,
	};
}

export function loadThemeConfig(): ThemeConfig {
	const themePath = getThemePath();
	if (!existsSync(themePath)) {
		return { version: THEME_VERSION, themes: {} };
	}

	try {
		const raw = JSON.parse(readFileSync(themePath, "utf8")) as unknown;
		return normalizeThemeConfig(raw);
	} catch {
		return { version: THEME_VERSION, themes: {} };
	}
}

export function resolveTheme(
	themeId: ThemeId,
	config: ThemeConfig,
): ThemePalette {
	if (config.themes[themeId]) {
		return config.themes[themeId] ?? CURSOR_DARK;
	}
	if (BUILTIN_THEMES[themeId]) {
		return BUILTIN_THEMES[themeId] ?? CURSOR_DARK;
	}
	return BUILTIN_THEMES[DEFAULT_THEME_ID] ?? CURSOR_DARK;
}

export function listThemeOptions(config: ThemeConfig): ThemeOption[] {
	const options: ThemeOption[] = [...BUILTIN_THEME_OPTIONS];
	for (const id of Object.keys(config.themes)) {
		if (BUILTIN_THEMES[id]) continue;
		options.push({ id, label: toTitleCase(id) });
	}
	return options;
}

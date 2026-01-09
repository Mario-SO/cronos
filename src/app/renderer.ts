import { loadSettings } from "@features/settings/settingsStorage";
import { createCliRenderer } from "@opentui/core";
import type { createRoot } from "@opentui/react";
import {
	ANSI_THEME_ID,
	DEFAULT_THEME_ID,
	loadThemeConfig,
	resolveTheme,
} from "@shared/themes";

const themeConfig = loadThemeConfig();
const initialThemeId = loadSettings().themeId ?? DEFAULT_THEME_ID;
const fallbackTheme = resolveTheme(DEFAULT_THEME_ID, themeConfig);
const initialTheme =
	initialThemeId === ANSI_THEME_ID
		? fallbackTheme
		: resolveTheme(initialThemeId, themeConfig);

export const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	backgroundColor: initialTheme.ui.background,
});

// Will be set after createRoot is called
export let root: ReturnType<typeof createRoot> | null = null;

export function setRoot(r: ReturnType<typeof createRoot>) {
	root = r;
}

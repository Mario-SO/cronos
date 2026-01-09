import type { ThemeId } from "@shared/types";
import type { ThemeOption } from "@shared/themes";
import {
	ANSI_THEME_ID,
	DEFAULT_THEME_ID,
	listThemeOptions,
	loadThemeConfig,
	resolveTheme,
	themeFromPalette,
} from "@shared/themes";
import { renderer } from "@app/renderer";
import { loadSettings } from "@features/settings/settingsStorage";
import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";

const themeConfig = loadThemeConfig();
const initialThemeId = loadSettings().themeId ?? DEFAULT_THEME_ID;
const fallbackTheme = resolveTheme(DEFAULT_THEME_ID, themeConfig);
const initialTheme =
	initialThemeId === ANSI_THEME_ID
		? fallbackTheme
		: resolveTheme(initialThemeId, themeConfig);

export const themeStateRef = createSubscriptionRef(initialTheme);

const applyAnsiTheme = () =>
	Effect.gen(function* () {
		const palette = yield* Effect.tryPromise(() => renderer.getPalette());
		const ansiTheme = themeFromPalette(palette, fallbackTheme);
		yield* SubscriptionRef.set(themeStateRef, ansiTheme);
	}).pipe(
		Effect.catchAll(() => SubscriptionRef.set(themeStateRef, fallbackTheme)),
	);

if (initialThemeId === ANSI_THEME_ID) {
	void Effect.runPromise(applyAnsiTheme());
}

export function useTheme() {
	return useSubscriptionValue(themeStateRef);
}

export function getThemeOptions(): ThemeOption[] {
	return listThemeOptions(themeConfig);
}

export function getTheme() {
	return getSubscriptionValue(themeStateRef);
}

export const setThemeId = (themeId: ThemeId) =>
	Effect.gen(function* () {
		if (themeId === ANSI_THEME_ID) {
			yield* SubscriptionRef.set(themeStateRef, fallbackTheme);
			yield* Effect.fork(applyAnsiTheme());
			return;
		}
		const next = resolveTheme(themeId, themeConfig);
		yield* SubscriptionRef.set(themeStateRef, next);
	});

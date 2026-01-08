import type { Settings, WeekStartDay } from "@core/types";
import { loadSettings, normalizeSettings, saveSettings } from "@lib/settings";
import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "./store";

const initialSettings = loadSettings();
export const settingsStateRef = createSubscriptionRef(initialSettings);

export function useSettings(): Settings {
	return useSubscriptionValue(settingsStateRef);
}

export function getSettings(): Settings {
	return getSubscriptionValue(settingsStateRef);
}

export const updateSettings = (patch: Partial<Settings>) =>
	Effect.gen(function* () {
		const current = yield* SubscriptionRef.get(settingsStateRef);
		const next = normalizeSettings({ ...current, ...patch });
		yield* SubscriptionRef.set(settingsStateRef, next);
		saveSettings(next);
	});

export const setWeekStartDay = (day: WeekStartDay) =>
	updateSettings({ weekStartDay: day });

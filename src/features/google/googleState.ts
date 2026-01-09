import type { GoogleCalendarRecord } from "@features/google/googleDb";
import {
	getGoogleCalendars,
	setGoogleCalendarEnabled,
} from "@features/google/googleDb";
import { Effect, SubscriptionRef } from "effect";
import { createSubscriptionRef, useSubscriptionValue } from "@shared/store";
import {
	connectGoogle,
	disconnectGoogle,
	syncGoogleNow,
} from "@features/google/googleSync";

type GoogleSyncStatus = "idle" | "syncing" | "error";

interface GoogleSyncState {
	status: GoogleSyncStatus;
	calendars: GoogleCalendarRecord[];
	lastSyncAt?: string;
	error?: string;
}

const initialState: GoogleSyncState = {
	status: "idle",
	calendars: [],
};

export const googleSyncStateRef = createSubscriptionRef(initialState);

export function useGoogleSyncState(): GoogleSyncState {
	return useSubscriptionValue(googleSyncStateRef);
}

export const initGoogleState = Effect.gen(function* () {
	const calendars = yield* getGoogleCalendars();
	yield* SubscriptionRef.set(googleSyncStateRef, {
		...initialState,
		calendars,
	});
});

export const refreshGoogleCalendars = () =>
	Effect.gen(function* () {
		const calendars = yield* getGoogleCalendars();
		yield* SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			calendars,
		}));
	});

export const toggleGoogleCalendar = (calendarId: string, enabled: boolean) =>
	Effect.gen(function* () {
		yield* setGoogleCalendarEnabled(calendarId, enabled);
		yield* refreshGoogleCalendars();
	});

export const connectGoogleAccount = () =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "syncing" as GoogleSyncStatus,
			error: undefined,
		}));
		yield* connectGoogle();
		yield* syncGoogleNow();
		const calendars = yield* getGoogleCalendars();
		const lastSyncAt =
			calendars
				.map((calendar) => calendar.lastSyncAt)
				.filter((value): value is string => Boolean(value))
				.sort()
				.at(-1) ?? undefined;
		yield* SubscriptionRef.set(googleSyncStateRef, {
			status: "idle" as GoogleSyncStatus,
			calendars,
			lastSyncAt,
			error: undefined,
		});
	}).pipe(
		Effect.catchAll((error) => {
			const message = error instanceof Error ? error.message : "Connect failed";
			return SubscriptionRef.update(googleSyncStateRef, (state) => ({
				...state,
				status: "error" as GoogleSyncStatus,
				error: message,
			}));
		}),
	);

export const disconnectGoogleAccount = () =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "idle" as GoogleSyncStatus,
			error: undefined,
		}));
		yield* Effect.catchAll(disconnectGoogle(), () => Effect.void);
		yield* SubscriptionRef.set(googleSyncStateRef, {
			...initialState,
			error: undefined,
		});
	});

export const runGoogleSync = () =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "syncing" as GoogleSyncStatus,
			error: undefined,
		}));
		yield* syncGoogleNow();
		const calendars = yield* getGoogleCalendars();
		const lastSyncAt =
			calendars
				.map((calendar) => calendar.lastSyncAt)
				.filter((value): value is string => Boolean(value))
				.sort()
				.at(-1) ?? undefined;
		yield* SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "idle" as GoogleSyncStatus,
			calendars,
			lastSyncAt,
			error: undefined,
		}));
	}).pipe(
		Effect.catchAll((error) => {
			const message = error instanceof Error ? error.message : "Sync failed";
			return SubscriptionRef.update(googleSyncStateRef, (state) => ({
				...state,
				status: "error" as GoogleSyncStatus,
				error: message,
			}));
		}),
	);

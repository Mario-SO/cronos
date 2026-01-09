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

export async function connectGoogleAccount(): Promise<void> {
	Effect.runSync(
		SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "syncing" as GoogleSyncStatus,
			error: undefined,
		})),
	);
	try {
		await connectGoogle();
		await syncGoogleNow();
		const calendars = Effect.runSync(getGoogleCalendars());
		const lastSyncAt =
			calendars
				.map((calendar) => calendar.lastSyncAt)
				.filter((value): value is string => Boolean(value))
				.sort()
				.at(-1) ?? undefined;
		Effect.runSync(
			SubscriptionRef.set(googleSyncStateRef, {
				status: "idle" as GoogleSyncStatus,
				calendars,
				lastSyncAt,
				error: undefined,
			}),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Connect failed";
		Effect.runSync(
			SubscriptionRef.update(googleSyncStateRef, (state) => ({
				...state,
				status: "error" as GoogleSyncStatus,
				error: message,
			})),
		);
	}
}

export async function disconnectGoogleAccount(): Promise<void> {
	Effect.runSync(
		SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "idle" as GoogleSyncStatus,
			error: undefined,
		})),
	);
	try {
		await disconnectGoogle();
	} catch {
		// Ignore disconnect errors and clear local state anyway.
	}
	Effect.runSync(
		SubscriptionRef.set(googleSyncStateRef, {
			...initialState,
			error: undefined,
		}),
	);
}

export async function runGoogleSync(): Promise<void> {
	Effect.runSync(
		SubscriptionRef.update(googleSyncStateRef, (state) => ({
			...state,
			status: "syncing" as GoogleSyncStatus,
			error: undefined,
		})),
	);
	try {
		await syncGoogleNow();
		const calendars = Effect.runSync(getGoogleCalendars());
		const lastSyncAt =
			calendars
				.map((calendar) => calendar.lastSyncAt)
				.filter((value): value is string => Boolean(value))
				.sort()
				.at(-1) ?? undefined;
		Effect.runSync(
			SubscriptionRef.update(googleSyncStateRef, (state) => ({
				...state,
				status: "idle" as GoogleSyncStatus,
				calendars,
				lastSyncAt,
				error: undefined,
			})),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Sync failed";
		Effect.runSync(
			SubscriptionRef.update(googleSyncStateRef, (state) => ({
				...state,
				status: "error" as GoogleSyncStatus,
				error: message,
			})),
		);
	}
}

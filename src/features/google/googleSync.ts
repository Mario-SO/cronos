import {
	deleteEventById,
	findEventByGoogleId,
	findEventsMissingGoogleId,
	findEventsUpdatedAfter,
	getMaxEventIdCounter,
	insertEvent,
	updateEventById,
} from "@data/repository";
import { initEventStore } from "@features/events/eventsState";
import {
	clearGoogleDeletion,
	getEnabledGoogleCalendars,
	getGoogleCalendars,
	getGoogleDeletions,
	updateGoogleCalendarSyncState,
	upsertGoogleCalendar,
} from "@features/google/googleDb";
import { getSettings, updateSettings } from "@features/settings/settingsState";
import { getColorByIndex } from "@shared/colors";
import type { CalendarEvent, GoogleSettings } from "@shared/types";
import { Effect } from "effect";
import {
	refreshGoogleToken,
	startGoogleOAuth,
	toGoogleAllDayEvent,
} from "./googleApi";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const MAX_RESULTS = 2500;
const MAX_RETRIES = 3;
const SYNC_RANGE_YEARS = 2; // Current year + next year.

interface GoogleCalendarListResponse {
	items?: Array<{
		id: string;
		summary?: string;
		primary?: boolean;
		accessRole?: "owner" | "writer" | "reader" | "freeBusyReader";
	}>;
	nextPageToken?: string;
}

interface GoogleEvent {
	id: string;
	status?: string;
	summary?: string;
	start?: { date?: string; dateTime?: string };
	end?: { date?: string; dateTime?: string };
	updated?: string;
	etag?: string;
	recurringEventId?: string;
	hangoutLink?: string;
	conferenceData?: {
		entryPoints?: Array<{
			entryPointType?: string;
			uri?: string;
			label?: string;
		}>;
	};
}

interface GoogleEventListResponse {
	items?: GoogleEvent[];
	nextPageToken?: string;
	nextSyncToken?: string;
}

function isTokenExpired(settings: GoogleSettings): boolean {
	if (!settings.tokenExpiry) return true;
	return Date.now() >= settings.tokenExpiry - 60_000;
}

const ensureAccessToken = () =>
	Effect.gen(function* () {
		const settings = yield* Effect.sync(() => getSettings());
		if (!settings.google.connected || !settings.google.accessToken) {
			return yield* Effect.fail(new Error("Google is not connected"));
		}
		if (!isTokenExpired(settings.google)) {
			return settings.google.accessToken;
		}
		const refreshed = yield* refreshGoogleToken(settings.google);
		if (!refreshed.accessToken) {
			return yield* Effect.fail(
				new Error("Missing access token after refresh"),
			);
		}
		yield* updateSettings({
			google: {
				connected: true,
				accessToken: refreshed.accessToken,
				refreshToken: refreshed.refreshToken,
				tokenExpiry: refreshed.tokenExpiry,
			},
		});
		return refreshed.accessToken;
	});

const googleRequest = (
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Effect.Effect<Response, Error, never> =>
	Effect.tryPromise(() => {
		const url = new URL(`${GOOGLE_API_BASE}${path}`);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) {
					url.searchParams.set(key, value);
				}
			}
		}
		return fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				...(options.headers ?? {}),
			},
		});
	});

const googleRequestWithRetry = (
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Effect.Effect<Response, Error, never> =>
	Effect.gen(function* () {
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			const response = yield* googleRequest(accessToken, path, options, params);
			if (
				response.status === 429 ||
				(response.status >= 500 && response.status < 600)
			) {
				if (attempt === MAX_RETRIES) {
					return response;
				}
				const backoffMs = 500 * 2 ** attempt;
				yield* Effect.sleep(backoffMs);
				continue;
			}
			return response;
		}
		return yield* Effect.fail(new Error("Retry loop failed"));
	});

const googleRequestJson = <T>(
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Effect.Effect<{ data: T; response: Response }, Error, never> =>
	Effect.gen(function* () {
		const response = yield* googleRequestWithRetry(
			accessToken,
			path,
			options,
			params,
		);
		if (!response.ok) {
			const errorText = yield* Effect.tryPromise(() => response.text());
			return yield* Effect.fail(
				new Error(`Google API error ${response.status}: ${errorText}`),
			);
		}
		const data = (yield* Effect.tryPromise(() => response.json())) as T;
		return { data, response };
	});

function parseGoogleDate(event: GoogleEvent): string | null {
	if (event.start?.date) return event.start.date;
	if (event.start?.dateTime) {
		return event.start.dateTime.split("T")[0] ?? null;
	}
	return null;
}

function getConferenceUrl(event: GoogleEvent): string | undefined {
	const entryPoints = event.conferenceData?.entryPoints ?? [];
	const videoEntry = entryPoints.find(
		(entry) => entry.entryPointType === "video" && entry.uri,
	);
	const anyEntry = entryPoints.find((entry) => entry.uri);
	return videoEntry?.uri ?? anyEntry?.uri ?? event.hangoutLink ?? undefined;
}

function canWriteCalendar(accessRole?: string): boolean {
	return accessRole === "owner" || accessRole === "writer";
}

function getSyncWindowBounds(): {
	startDate: string;
	endDateExclusive: string;
	timeMin: string;
	timeMax: string;
} {
	const now = new Date();
	const startYear = now.getUTCFullYear();
	const endYearExclusive = startYear + SYNC_RANGE_YEARS;
	const startDate = `${startYear}-01-01`;
	const endDateExclusive = `${endYearExclusive}-01-01`;
	const timeMin = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0)).toISOString();
	const timeMax = new Date(
		Date.UTC(endYearExclusive, 0, 1, 0, 0, 0),
	).toISOString();
	return { startDate, endDateExclusive, timeMin, timeMax };
}

function isDateInSyncWindow(dateKey: string): boolean {
	const { startDate, endDateExclusive } = getSyncWindowBounds();
	return dateKey >= startDate && dateKey < endDateExclusive;
}

function toIso(value?: string): string | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) return undefined;
	return new Date(timestamp).toISOString();
}

function compareTimestamps(a?: string, b?: string): number {
	if (!a && !b) return 0;
	if (!a) return -1;
	if (!b) return 1;
	return Date.parse(a) - Date.parse(b);
}

function buildLocalEventFromGoogle(
	event: GoogleEvent,
	calendarId: string,
	color: CalendarEvent["color"],
): CalendarEvent | null {
	const date = parseGoogleDate(event);
	if (!date) return null;
	return {
		id: "",
		date,
		title: event.summary ?? "(No title)",
		color,
		googleEventId: event.id,
		googleCalendarId: calendarId,
		googleEtag: event.etag ?? undefined,
		conferenceUrl: getConferenceUrl(event),
		updatedAt: toIso(event.updated) ?? new Date().toISOString(),
	};
}

const fetchAllCalendars = (
	accessToken: string,
): Effect.Effect<GoogleCalendarListResponse["items"], Error, never> =>
	Effect.gen(function* () {
		let pageToken: string | undefined;
		const items: GoogleCalendarListResponse["items"] = [];

		do {
			const { data } = yield* googleRequestJson<GoogleCalendarListResponse>(
				accessToken,
				"/users/me/calendarList",
				{},
				pageToken ? { pageToken } : undefined,
			);
			if (data.items) {
				items?.push(...data.items);
			}
			pageToken = data.nextPageToken;
		} while (pageToken);

		return items ?? [];
	});

export const connectGoogle = () =>
	Effect.gen(function* () {
		const tokens = yield* startGoogleOAuth();
		yield* updateSettings({
			google: {
				connected: true,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				tokenExpiry: tokens.tokenExpiry,
			},
		});
	});

export const disconnectGoogle = () =>
	Effect.gen(function* () {
		const settings = yield* Effect.sync(() => getSettings());
		if (!settings.google.connected) return;
		yield* updateSettings({
			google: {
				connected: false,
				accessToken: undefined,
				refreshToken: undefined,
				tokenExpiry: undefined,
			},
		});
	});

const refreshCalendars = (accessToken: string) =>
	Effect.gen(function* () {
		const existing = yield* getGoogleCalendars();
		const existingMap = new Map(
			existing.map((calendar) => [calendar.calendarId, calendar]),
		);
		const incoming = yield* fetchAllCalendars(accessToken);
		let newIndex = existing.length;

		for (const calendar of incoming ?? []) {
			if (!calendar.id) continue;
			const existingCalendar = existingMap.get(calendar.id);
			const canWrite = canWriteCalendar(calendar.accessRole);
			const color = existingCalendar?.color ?? getColorByIndex(newIndex++);
			const enabled = existingCalendar?.enabled ?? !!canWrite;
			yield* upsertGoogleCalendar({
				calendarId: calendar.id,
				summary: calendar.summary ?? "Untitled",
				color,
				enabled,
				canWrite,
				syncToken: existingCalendar?.syncToken,
				lastSyncAt: existingCalendar?.lastSyncAt,
			});
		}
	});

const listGoogleEvents = (
	accessToken: string,
	calendarId: string,
	syncToken?: string | null,
	pageToken?: string,
): Effect.Effect<
	GoogleEventListResponse & { syncTokenExpired?: boolean },
	Error,
	never
> =>
	Effect.gen(function* () {
		const { timeMin, timeMax } = getSyncWindowBounds();
		const params: Record<string, string> = {
			singleEvents: "true",
			maxResults: `${MAX_RESULTS}`,
			showDeleted: "true",
			conferenceDataVersion: "1",
		};
		if (syncToken) {
			params.syncToken = syncToken;
		} else {
			params.timeMin = timeMin;
			params.timeMax = timeMax;
		}
		if (pageToken) params.pageToken = pageToken;

		const response = yield* googleRequestWithRetry(
			accessToken,
			`/calendars/${encodeURIComponent(calendarId)}/events`,
			{ method: "GET" },
			params,
		);

		if (response.status === 410) {
			return { items: [], syncTokenExpired: true };
		}
		if (!response.ok) {
			const errorText = yield* Effect.tryPromise(() => response.text());
			return yield* Effect.fail(
				new Error(`Events list failed ${response.status}: ${errorText}`),
			);
		}
		return (yield* Effect.tryPromise(() => response.json())) as
			| GoogleEventListResponse
			| (GoogleEventListResponse & { syncTokenExpired?: boolean });
	});

const createGoogleEvent = (
	accessToken: string,
	calendarId: string,
	event: CalendarEvent,
): Effect.Effect<
	{ id: string; etag?: string; updated?: string },
	Error,
	never
> =>
	Effect.gen(function* () {
		const body = toGoogleAllDayEvent(event);
		const { data } = yield* googleRequestJson<GoogleEvent>(
			accessToken,
			`/calendars/${encodeURIComponent(calendarId)}/events`,
			{
				method: "POST",
				body: JSON.stringify(body),
			},
		);
		return {
			id: data.id,
			etag: data.etag ?? undefined,
			updated: data.updated,
		};
	});

const updateGoogleEvent = (
	accessToken: string,
	calendarId: string,
	googleEventId: string,
	event: CalendarEvent,
): Effect.Effect<{ etag?: string; updated?: string }, Error, never> =>
	Effect.gen(function* () {
		const body = toGoogleAllDayEvent(event);
		const { data } = yield* googleRequestJson<GoogleEvent>(
			accessToken,
			`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
				googleEventId,
			)}`,
			{
				method: "PATCH",
				body: JSON.stringify(body),
			},
		);
		return {
			etag: data.etag ?? undefined,
			updated: data.updated,
		};
	});

const deleteGoogleEvent = (
	accessToken: string,
	calendarId: string,
	googleEventId: string,
): Effect.Effect<void, Error, never> =>
	Effect.gen(function* () {
		const response = yield* googleRequestWithRetry(
			accessToken,
			`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
				googleEventId,
			)}`,
			{ method: "DELETE" },
		);
		if (response.status === 404) return;
		if (!response.ok) {
			const errorText = yield* Effect.tryPromise(() => response.text());
			return yield* Effect.fail(
				new Error(`Delete failed ${response.status}: ${errorText}`),
			);
		}
	});

const syncCalendar = (
	accessToken: string,
	calendarId: string,
	color: CalendarEvent["color"],
	canWrite: boolean,
	syncToken?: string | null,
	lastSyncAt?: string | null,
	forceRefresh?: boolean,
): Effect.Effect<
	{ syncToken?: string | null; lastSyncAt?: string | null },
	Error,
	never
> =>
	Effect.gen(function* () {
		let pageToken: string | undefined;
		let nextSyncToken: string | null | undefined;
		let activeSyncToken =
			canWrite && !forceRefresh ? (syncToken ?? null) : null;
		const touchedLocalIds = new Set<string>();
		const localCounterStart = yield* getMaxEventIdCounter();
		let localCounter = localCounterStart;

		const processEvent = (event: GoogleEvent) =>
			Effect.gen(function* () {
				const local = yield* findEventByGoogleId(calendarId, event.id);
				const remoteUpdatedAt = toIso(event.updated);

				if (event.status === "cancelled") {
					yield* clearGoogleDeletion(calendarId, event.id);
					if (!local) return;
					if (!isDateInSyncWindow(local.date)) return;
					const localUpdated = local.updatedAt;
					if (
						canWrite &&
						compareTimestamps(localUpdated, remoteUpdatedAt) > 0
					) {
						const created = yield* createGoogleEvent(
							accessToken,
							calendarId,
							local,
						);
						yield* updateEventById(local.id, {
							googleEventId: created.id,
							googleCalendarId: calendarId,
							googleEtag: created.etag,
							updatedAt: toIso(created.updated) ?? local.updatedAt,
						});
						touchedLocalIds.add(local.id);
						return;
					}
					yield* deleteEventById(local.id);
					touchedLocalIds.add(local.id);
					return;
				}

				const mapped = buildLocalEventFromGoogle(event, calendarId, color);
				if (!mapped) return;
				if (!isDateInSyncWindow(mapped.date)) {
					if (local) {
						yield* deleteEventById(local.id);
					}
					return;
				}

				if (!local) {
					localCounter += 1;
					const newEvent: CalendarEvent = {
						...mapped,
						id: `event-${localCounter}-${Date.now()}`,
					};
					yield* insertEvent(newEvent);
					touchedLocalIds.add(newEvent.id);
					return;
				}

				const comparison = compareTimestamps(local.updatedAt, mapped.updatedAt);
				if (comparison > 0 && canWrite) {
					const updated = yield* updateGoogleEvent(
						accessToken,
						calendarId,
						event.id,
						local,
					);
					yield* updateEventById(local.id, {
						googleEtag: updated.etag,
						updatedAt: toIso(updated.updated) ?? local.updatedAt,
						...(forceRefresh ? { conferenceUrl: mapped.conferenceUrl } : {}),
					});
					touchedLocalIds.add(local.id);
					return;
				}

				yield* updateEventById(local.id, {
					date: mapped.date,
					title: mapped.title,
					color: mapped.color,
					googleEtag: mapped.googleEtag,
					conferenceUrl: mapped.conferenceUrl,
					updatedAt: mapped.updatedAt,
				});
				touchedLocalIds.add(local.id);
			});

		while (true) {
			const response = yield* listGoogleEvents(
				accessToken,
				calendarId,
				activeSyncToken,
				pageToken,
			);
			if (response.syncTokenExpired) {
				activeSyncToken = null;
				pageToken = undefined;
				continue;
			}
			const items = response.items ?? [];
			for (const event of items) {
				yield* processEvent(event);
			}
			pageToken = response.nextPageToken;
			if (!pageToken && response.nextSyncToken) {
				nextSyncToken = response.nextSyncToken;
			}
			if (!pageToken) break;
		}

		const effectiveLastSyncAt = lastSyncAt ?? new Date(0).toISOString();
		const localChanges = yield* findEventsUpdatedAfter(
			calendarId,
			effectiveLastSyncAt,
		);
		if (canWrite) {
			for (const event of localChanges) {
				if (!event.googleEventId) continue;
				if (touchedLocalIds.has(event.id)) continue;
				if (!isDateInSyncWindow(event.date)) continue;
				const updated = yield* updateGoogleEvent(
					accessToken,
					calendarId,
					event.googleEventId,
					event,
				);
				yield* updateEventById(event.id, {
					googleEtag: updated.etag,
					updatedAt: toIso(updated.updated) ?? event.updatedAt,
				});
			}
		}

		return {
			syncToken: canWrite ? (nextSyncToken ?? activeSyncToken ?? null) : null,
			lastSyncAt: new Date().toISOString(),
		};
	});

const syncLocalCreations = (accessToken: string) =>
	Effect.gen(function* () {
		const calendars = (yield* getEnabledGoogleCalendars()).filter(
			(calendar) => calendar.canWrite,
		);
		if (calendars.length === 0) return;
		const calendarsByColor = new Map(
			calendars.map((calendar) => [calendar.color, calendar]),
		);
		const fallbackCalendar = calendars[0];
		const localEvents = yield* findEventsMissingGoogleId();

		for (const event of localEvents) {
			if (!isDateInSyncWindow(event.date)) continue;
			const calendar = calendarsByColor.get(event.color) ?? fallbackCalendar;
			if (!calendar) continue;
			const created = yield* createGoogleEvent(
				accessToken,
				calendar.calendarId,
				event,
			);
			yield* updateEventById(event.id, {
				googleEventId: created.id,
				googleCalendarId: calendar.calendarId,
				googleEtag: created.etag,
				color: calendar.color,
				updatedAt: toIso(created.updated) ?? event.updatedAt,
			});
		}
	});

const syncDeletions = (
	accessToken: string,
	calendarId: string,
): Effect.Effect<void, Error, never> =>
	Effect.gen(function* () {
		const deletions = yield* getGoogleDeletions(calendarId);
		for (const deletion of deletions) {
			const result = yield* Effect.either(
				deleteGoogleEvent(accessToken, calendarId, deletion.event_id),
			);
			if (result._tag === "Left") {
				continue;
			}
			yield* clearGoogleDeletion(calendarId, deletion.event_id);
		}
	});

export const syncGoogleNow = (options?: { forceRefresh?: boolean }) =>
	Effect.gen(function* () {
		const accessToken = yield* ensureAccessToken();
		yield* refreshCalendars(accessToken);
		const calendars = yield* getGoogleCalendars();

		for (const calendar of calendars) {
			if (!calendar.enabled) continue;
			if (calendar.canWrite) {
				yield* syncDeletions(accessToken, calendar.calendarId);
			}
			const result = yield* syncCalendar(
				accessToken,
				calendar.calendarId,
				calendar.color,
				calendar.canWrite,
				calendar.syncToken ?? null,
				calendar.lastSyncAt ?? null,
				options?.forceRefresh ?? false,
			);
			yield* updateGoogleCalendarSyncState(
				calendar.calendarId,
				result.syncToken ?? null,
				result.lastSyncAt ?? null,
			);
		}

		yield* syncLocalCreations(accessToken);
		yield* initEventStore;
	});

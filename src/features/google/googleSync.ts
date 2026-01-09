import type { CalendarEvent, GoogleSettings } from "@shared/types";
import {
	clearGoogleDeletion,
	getEnabledGoogleCalendars,
	getGoogleCalendars,
	getGoogleDeletions,
	updateGoogleCalendarSyncState,
	upsertGoogleCalendar,
} from "@features/google/googleDb";
import {
	deleteEventById,
	findEventByGoogleId,
	findEventsMissingGoogleId,
	findEventsUpdatedAfter,
	getMaxEventIdCounter,
	insertEvent,
	updateEventById,
} from "@data/repository";
import { getColorByIndex } from "@shared/colors";
import { initEventStore } from "@features/events/eventsState";
import { getSettings, updateSettings } from "@features/settings/settingsState";
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

async function ensureAccessToken(): Promise<string> {
	const settings = getSettings();
	if (!settings.google.connected || !settings.google.accessToken) {
		throw new Error("Google is not connected");
	}
	if (!isTokenExpired(settings.google)) {
		return settings.google.accessToken;
	}
	const refreshed = await refreshGoogleToken(settings.google);
	if (!refreshed.accessToken) {
		throw new Error("Missing access token after refresh");
	}
	Effect.runSync(
		updateSettings({
			google: {
				connected: true,
				accessToken: refreshed.accessToken,
				refreshToken: refreshed.refreshToken,
				tokenExpiry: refreshed.tokenExpiry,
			},
		}),
	);
	return refreshed.accessToken;
}

async function googleRequest(
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Promise<Response> {
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
}

async function googleRequestWithRetry(
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Promise<Response> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const response = await googleRequest(accessToken, path, options, params);
		if (
			response.status === 429 ||
			(response.status >= 500 && response.status < 600)
		) {
			if (attempt === MAX_RETRIES) {
				return response;
			}
			const backoffMs = 500 * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
			continue;
		}
		return response;
	}
	throw new Error("Retry loop failed");
}

async function googleRequestJson<T>(
	accessToken: string,
	path: string,
	options: RequestInit = {},
	params?: Record<string, string>,
): Promise<{ data: T; response: Response }> {
	const response = await googleRequestWithRetry(
		accessToken,
		path,
		options,
		params,
	);
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Google API error ${response.status}: ${errorText}`);
	}
	return { data: (await response.json()) as T, response };
}

function parseGoogleDate(event: GoogleEvent): string | null {
	if (event.start?.date) return event.start.date;
	if (event.start?.dateTime) {
		return event.start.dateTime.split("T")[0] ?? null;
	}
	return null;
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
		updatedAt: toIso(event.updated) ?? new Date().toISOString(),
	};
}

async function fetchAllCalendars(
	accessToken: string,
): Promise<GoogleCalendarListResponse["items"]> {
	let pageToken: string | undefined;
	const items: GoogleCalendarListResponse["items"] = [];

	do {
		const { data } = await googleRequestJson<GoogleCalendarListResponse>(
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
}

export async function connectGoogle(): Promise<void> {
	const tokens = await startGoogleOAuth();
	Effect.runSync(
		updateSettings({
			google: {
				connected: true,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				tokenExpiry: tokens.tokenExpiry,
			},
		}),
	);
}

export async function disconnectGoogle(): Promise<void> {
	const settings = getSettings();
	if (!settings.google.connected) return;
	Effect.runSync(
		updateSettings({
			google: {
				connected: false,
				accessToken: undefined,
				refreshToken: undefined,
				tokenExpiry: undefined,
			},
		}),
	);
}

async function refreshCalendars(accessToken: string): Promise<void> {
	const existing = Effect.runSync(getGoogleCalendars());
	const existingMap = new Map(
		existing.map((calendar) => [calendar.calendarId, calendar]),
	);
	const incoming = await fetchAllCalendars(accessToken);
	let newIndex = existing.length;

	for (const calendar of incoming ?? []) {
		if (!calendar.id) continue;
		const existingCalendar = existingMap.get(calendar.id);
		const canWrite = canWriteCalendar(calendar.accessRole);
		const color = existingCalendar?.color ?? getColorByIndex(newIndex++);
		const enabled = existingCalendar?.enabled ?? !!canWrite;
		Effect.runSync(
			upsertGoogleCalendar({
				calendarId: calendar.id,
				summary: calendar.summary ?? "Untitled",
				color,
				enabled,
				canWrite,
				syncToken: existingCalendar?.syncToken,
				lastSyncAt: existingCalendar?.lastSyncAt,
			}),
		);
	}
}

async function listGoogleEvents(
	accessToken: string,
	calendarId: string,
	syncToken?: string | null,
	pageToken?: string,
): Promise<GoogleEventListResponse & { syncTokenExpired?: boolean }> {
	const { timeMin, timeMax } = getSyncWindowBounds();
	const params: Record<string, string> = {
		singleEvents: "true",
		maxResults: `${MAX_RESULTS}`,
		showDeleted: "true",
	};
	if (syncToken) {
		params.syncToken = syncToken;
	} else {
		params.timeMin = timeMin;
		params.timeMax = timeMax;
	}
	if (pageToken) params.pageToken = pageToken;

	const response = await googleRequestWithRetry(
		accessToken,
		`/calendars/${encodeURIComponent(calendarId)}/events`,
		{ method: "GET" },
		params,
	);

	if (response.status === 410) {
		return { items: [], syncTokenExpired: true };
	}
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Events list failed ${response.status}: ${errorText}`);
	}
	return (await response.json()) as GoogleEventListResponse;
}

async function createGoogleEvent(
	accessToken: string,
	calendarId: string,
	event: CalendarEvent,
): Promise<{ id: string; etag?: string; updated?: string }> {
	const body = toGoogleAllDayEvent(event);
	const { data } = await googleRequestJson<GoogleEvent>(
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
}

async function updateGoogleEvent(
	accessToken: string,
	calendarId: string,
	googleEventId: string,
	event: CalendarEvent,
): Promise<{ etag?: string; updated?: string }> {
	const body = toGoogleAllDayEvent(event);
	const { data } = await googleRequestJson<GoogleEvent>(
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
}

async function deleteGoogleEvent(
	accessToken: string,
	calendarId: string,
	googleEventId: string,
): Promise<void> {
	const response = await googleRequestWithRetry(
		accessToken,
		`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
			googleEventId,
		)}`,
		{ method: "DELETE" },
	);
	if (response.status === 404) return;
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Delete failed ${response.status}: ${errorText}`);
	}
}

async function syncCalendar(
	accessToken: string,
	calendarId: string,
	color: CalendarEvent["color"],
	canWrite: boolean,
	syncToken?: string | null,
	lastSyncAt?: string | null,
): Promise<{ syncToken?: string | null; lastSyncAt?: string | null }> {
	let pageToken: string | undefined;
	let nextSyncToken: string | null | undefined;
	let activeSyncToken = canWrite ? (syncToken ?? null) : null;
	const touchedLocalIds = new Set<string>();
	const localCounterStart = await Effect.runSync(getMaxEventIdCounter());
	let localCounter = localCounterStart;

	const processEvent = async (event: GoogleEvent) => {
		const local = Effect.runSync(findEventByGoogleId(calendarId, event.id));
		const remoteUpdatedAt = toIso(event.updated);

		if (event.status === "cancelled") {
			Effect.runSync(clearGoogleDeletion(calendarId, event.id));
			if (!local) return;
			if (!isDateInSyncWindow(local.date)) return;
			const localUpdated = local.updatedAt;
			if (canWrite && compareTimestamps(localUpdated, remoteUpdatedAt) > 0) {
				const created = await createGoogleEvent(accessToken, calendarId, local);
				Effect.runSync(
					updateEventById(local.id, {
						googleEventId: created.id,
						googleCalendarId: calendarId,
						googleEtag: created.etag,
						updatedAt: toIso(created.updated) ?? local.updatedAt,
					}),
				);
				touchedLocalIds.add(local.id);
				return;
			}
			Effect.runSync(deleteEventById(local.id));
			touchedLocalIds.add(local.id);
			return;
		}

		const mapped = buildLocalEventFromGoogle(event, calendarId, color);
		if (!mapped) return;
		if (!isDateInSyncWindow(mapped.date)) {
			if (local) {
				Effect.runSync(deleteEventById(local.id));
			}
			return;
		}

		if (!local) {
			localCounter += 1;
			const newEvent: CalendarEvent = {
				...mapped,
				id: `event-${localCounter}-${Date.now()}`,
			};
			Effect.runSync(insertEvent(newEvent));
			touchedLocalIds.add(newEvent.id);
			return;
		}

		const comparison = compareTimestamps(local.updatedAt, mapped.updatedAt);
		if (comparison > 0 && canWrite) {
			const updated = await updateGoogleEvent(
				accessToken,
				calendarId,
				event.id,
				local,
			);
			Effect.runSync(
				updateEventById(local.id, {
					googleEtag: updated.etag,
					updatedAt: toIso(updated.updated) ?? local.updatedAt,
				}),
			);
			touchedLocalIds.add(local.id);
			return;
		}

		Effect.runSync(
			updateEventById(local.id, {
				date: mapped.date,
				title: mapped.title,
				color: mapped.color,
				googleEtag: mapped.googleEtag,
				updatedAt: mapped.updatedAt,
			}),
		);
		touchedLocalIds.add(local.id);
	};

	while (true) {
		const response = await listGoogleEvents(
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
			await processEvent(event);
		}
		pageToken = response.nextPageToken;
		if (!pageToken && response.nextSyncToken) {
			nextSyncToken = response.nextSyncToken;
		}
		if (!pageToken) break;
	}

	const effectiveLastSyncAt = lastSyncAt ?? new Date(0).toISOString();
	const localChanges = Effect.runSync(
		findEventsUpdatedAfter(calendarId, effectiveLastSyncAt),
	);
	if (canWrite) {
		for (const event of localChanges) {
			if (!event.googleEventId) continue;
			if (touchedLocalIds.has(event.id)) continue;
			if (!isDateInSyncWindow(event.date)) continue;
			const updated = await updateGoogleEvent(
				accessToken,
				calendarId,
				event.googleEventId,
				event,
			);
			Effect.runSync(
				updateEventById(event.id, {
					googleEtag: updated.etag,
					updatedAt: toIso(updated.updated) ?? event.updatedAt,
				}),
			);
		}
	}

	return {
		syncToken: canWrite ? (nextSyncToken ?? activeSyncToken ?? null) : null,
		lastSyncAt: new Date().toISOString(),
	};
}

async function syncLocalCreations(accessToken: string): Promise<void> {
	const calendars = Effect.runSync(getEnabledGoogleCalendars()).filter(
		(calendar) => calendar.canWrite,
	);
	if (calendars.length === 0) return;
	const calendarsByColor = new Map(
		calendars.map((calendar) => [calendar.color, calendar]),
	);
	const fallbackCalendar = calendars[0];
	const localEvents = Effect.runSync(findEventsMissingGoogleId());

	for (const event of localEvents) {
		if (!isDateInSyncWindow(event.date)) continue;
		const calendar = calendarsByColor.get(event.color) ?? fallbackCalendar;
		if (!calendar) continue;
		const created = await createGoogleEvent(
			accessToken,
			calendar.calendarId,
			event,
		);
		Effect.runSync(
			updateEventById(event.id, {
				googleEventId: created.id,
				googleCalendarId: calendar.calendarId,
				googleEtag: created.etag,
				color: calendar.color,
				updatedAt: toIso(created.updated) ?? event.updatedAt,
			}),
		);
	}
}

async function syncDeletions(
	accessToken: string,
	calendarId: string,
): Promise<void> {
	const deletions = Effect.runSync(getGoogleDeletions(calendarId));
	for (const deletion of deletions) {
		try {
			await deleteGoogleEvent(accessToken, calendarId, deletion.event_id);
		} catch {
			continue;
		}
		Effect.runSync(clearGoogleDeletion(calendarId, deletion.event_id));
	}
}

export async function syncGoogleNow(): Promise<void> {
	const accessToken = await ensureAccessToken();
	await refreshCalendars(accessToken);
	const calendars = Effect.runSync(getGoogleCalendars());

	for (const calendar of calendars) {
		if (!calendar.enabled) continue;
		if (calendar.canWrite) {
			await syncDeletions(accessToken, calendar.calendarId);
		}
		const result = await syncCalendar(
			accessToken,
			calendar.calendarId,
			calendar.color,
			calendar.canWrite,
			calendar.syncToken ?? null,
			calendar.lastSyncAt ?? null,
		);
		Effect.runSync(
			updateGoogleCalendarSyncState(
				calendar.calendarId,
				result.syncToken ?? null,
				result.lastSyncAt ?? null,
			),
		);
	}

	await syncLocalCreations(accessToken);
	Effect.runSync(initEventStore);
}

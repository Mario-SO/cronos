import type { CalendarEvent, ColorName } from "@shared/types";
import { Effect } from "effect";
import { getDatabase } from "./db";

interface EventRow {
	id: string;
	date: string;
	title: string;
	start_time: number | null;
	end_time: number | null;
	color: string;
	google_event_id: string | null;
	google_calendar_id: string | null;
	google_etag: string | null;
	conference_url: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Convert a database row to a CalendarEvent.
 */
function rowToEvent(row: EventRow): CalendarEvent {
	return {
		id: row.id,
		date: row.date,
		title: row.title,
		startTime: row.start_time ?? undefined,
		endTime: row.end_time ?? undefined,
		color: row.color as ColorName,
		googleEventId: row.google_event_id ?? undefined,
		googleCalendarId: row.google_calendar_id ?? undefined,
		googleEtag: row.google_etag ?? undefined,
		conferenceUrl: row.conference_url ?? undefined,
		updatedAt: row.updated_at ?? undefined,
	};
}

/**
 * Insert a new event into the database.
 */
export const insertEvent = (event: CalendarEvent) =>
	Effect.sync(() => {
		const db = getDatabase();
		const now = event.updatedAt ?? new Date().toISOString();
		const stmt = db.prepare(`
			INSERT INTO events (
				id,
				date,
				title,
				start_time,
				end_time,
				color,
				google_event_id,
				google_calendar_id,
				google_etag,
				conference_url,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		stmt.run(
			event.id,
			event.date,
			event.title,
			event.startTime ?? null,
			event.endTime ?? null,
			event.color,
			event.googleEventId ?? null,
			event.googleCalendarId ?? null,
			event.googleEtag ?? null,
			event.conferenceUrl ?? null,
			now,
		);
	});

/**
 * Update an existing event by ID.
 */
export const updateEventById = (
	id: string,
	updates: Partial<Omit<CalendarEvent, "id">>,
) =>
	Effect.sync(() => {
		const db = getDatabase();

		// Build dynamic update query based on provided fields
		const setClauses: string[] = [];
		const values: (string | number | null)[] = [];

		if (updates.date !== undefined) {
			setClauses.push("date = ?");
			values.push(updates.date);
		}
		if (updates.title !== undefined) {
			setClauses.push("title = ?");
			values.push(updates.title);
		}
		if ("startTime" in updates) {
			setClauses.push("start_time = ?");
			values.push(updates.startTime ?? null);
		}
		if ("endTime" in updates) {
			setClauses.push("end_time = ?");
			values.push(updates.endTime ?? null);
		}
		if (updates.color !== undefined) {
			setClauses.push("color = ?");
			values.push(updates.color);
		}
		if ("googleEventId" in updates) {
			setClauses.push("google_event_id = ?");
			values.push(updates.googleEventId ?? null);
		}
		if ("googleCalendarId" in updates) {
			setClauses.push("google_calendar_id = ?");
			values.push(updates.googleCalendarId ?? null);
		}
		if ("googleEtag" in updates) {
			setClauses.push("google_etag = ?");
			values.push(updates.googleEtag ?? null);
		}
		if ("conferenceUrl" in updates) {
			setClauses.push("conference_url = ?");
			values.push(updates.conferenceUrl ?? null);
		}

		if (setClauses.length === 0) {
			return; // Nothing to update
		}

		const nextUpdatedAt = updates.updatedAt ?? new Date().toISOString();
		setClauses.push("updated_at = ?");
		values.push(nextUpdatedAt);

		const stmt = db.prepare(`
			UPDATE events
			SET ${setClauses.join(", ")}
			WHERE id = ?
		`);
		values.push(id);
		stmt.run(...values);
	});

/**
 * Delete an event by ID.
 * Returns true if an event was deleted, false otherwise.
 */
export const deleteEventById = (id: string) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare("DELETE FROM events WHERE id = ?");
		const result = stmt.run(id);
		return result.changes > 0;
	});

/**
 * Find all events for a specific date.
 */
export const findEventsByDate = (dateKey: string) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM events WHERE date = ? ORDER BY start_time ASC NULLS FIRST",
		);
		const rows = stmt.all(dateKey) as EventRow[];
		return rows.map(rowToEvent);
	});

/**
 * Find all events in the database.
 */
export const findAllEvents = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM events ORDER BY date ASC, start_time ASC NULLS FIRST",
		);
		const rows = stmt.all() as EventRow[];
		return rows.map(rowToEvent);
	});

/**
 * Find an event by Google calendar + event ID.
 */
export const findEventByGoogleId = (
	calendarId: string,
	googleEventId: string,
) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM events WHERE google_calendar_id = ? AND google_event_id = ?",
		);
		const row = stmt.get(calendarId, googleEventId) as EventRow | undefined;
		return row ? rowToEvent(row) : null;
	});

/**
 * Find events updated after a given ISO timestamp for a calendar.
 */
export const findEventsUpdatedAfter = (
	calendarId: string,
	updatedAfter: string,
) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM events WHERE google_calendar_id = ? AND datetime(updated_at) > datetime(?)",
		);
		const rows = stmt.all(calendarId, updatedAfter) as EventRow[];
		return rows.map(rowToEvent);
	});

/**
 * Find events without a Google event ID.
 */
export const findEventsMissingGoogleId = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM events WHERE google_event_id IS NULL",
		);
		const rows = stmt.all() as EventRow[];
		return rows.map(rowToEvent);
	});

/**
 * Get the highest event ID counter value from existing events.
 * Used to restore the counter on app startup.
 */
export const getMaxEventIdCounter = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare("SELECT id FROM events");
		const rows = stmt.all() as { id: string }[];

		let maxCounter = 0;
		for (const row of rows) {
			// Parse event IDs like "event-123-1234567890"
			const match = row.id.match(/^event-(\d+)-/);
			if (match?.[1]) {
				const counter = parseInt(match[1], 10);
				if (counter > maxCounter) {
					maxCounter = counter;
				}
			}
		}
		return maxCounter;
	});

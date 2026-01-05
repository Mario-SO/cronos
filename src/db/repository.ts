import type { CalendarEvent, ColorName } from "@core/types";
import { Effect } from "effect";
import { getDatabase } from "./index";

interface EventRow {
	id: string;
	date: string;
	title: string;
	start_time: number | null;
	end_time: number | null;
	color: string;
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
	};
}

/**
 * Insert a new event into the database.
 */
export const insertEvent = (event: CalendarEvent) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(`
			INSERT INTO events (id, date, title, start_time, end_time, color)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		stmt.run(
			event.id,
			event.date,
			event.title,
			event.startTime ?? null,
			event.endTime ?? null,
			event.color,
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

		if (setClauses.length === 0) {
			return; // Nothing to update
		}

		// Always update the updated_at timestamp
		setClauses.push("updated_at = datetime('now')");

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
		const stmt = db.prepare("SELECT * FROM events WHERE date = ? ORDER BY start_time ASC NULLS FIRST");
		const rows = stmt.all(dateKey) as EventRow[];
		return rows.map(rowToEvent);
	});

/**
 * Find all events in the database.
 */
export const findAllEvents = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare("SELECT * FROM events ORDER BY date ASC, start_time ASC NULLS FIRST");
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

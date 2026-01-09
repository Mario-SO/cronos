import type { ColorName } from "@shared/types";
import { Effect } from "effect";
import { getDatabase } from "@data/db";

export interface GoogleCalendarRecord {
	calendarId: string;
	summary: string;
	color: ColorName;
	enabled: boolean;
	canWrite: boolean;
	syncToken?: string | null;
	lastSyncAt?: string | null;
}

interface GoogleCalendarRow {
	calendar_id: string;
	summary: string;
	color: string;
	enabled: number;
	can_write: number;
	sync_token: string | null;
	last_sync_at: string | null;
}

function rowToCalendar(row: GoogleCalendarRow): GoogleCalendarRecord {
	return {
		calendarId: row.calendar_id,
		summary: row.summary,
		color: row.color as ColorName,
		enabled: row.enabled === 1,
		canWrite: row.can_write === 1,
		syncToken: row.sync_token,
		lastSyncAt: row.last_sync_at,
	};
}

export const upsertGoogleCalendar = (calendar: GoogleCalendarRecord) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(`
			INSERT INTO google_calendars (
				calendar_id,
				summary,
				color,
				enabled,
				can_write,
				sync_token,
				last_sync_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(calendar_id) DO UPDATE SET
				summary = excluded.summary,
				color = excluded.color,
				enabled = excluded.enabled,
				can_write = excluded.can_write,
				sync_token = excluded.sync_token,
				last_sync_at = excluded.last_sync_at,
				updated_at = excluded.updated_at
		`);
		stmt.run(
			calendar.calendarId,
			calendar.summary,
			calendar.color,
			calendar.enabled ? 1 : 0,
			calendar.canWrite ? 1 : 0,
			calendar.syncToken ?? null,
			calendar.lastSyncAt ?? null,
			new Date().toISOString(),
		);
	});

export const getGoogleCalendars = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM google_calendars ORDER BY summary ASC",
		);
		const rows = stmt.all() as GoogleCalendarRow[];
		return rows.map(rowToCalendar);
	});

export const getEnabledGoogleCalendars = () =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT * FROM google_calendars WHERE enabled = 1 ORDER BY summary ASC",
		);
		const rows = stmt.all() as GoogleCalendarRow[];
		return rows.map(rowToCalendar);
	});

export const setGoogleCalendarEnabled = (
	calendarId: string,
	enabled: boolean,
) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"UPDATE google_calendars SET enabled = ?, updated_at = ? WHERE calendar_id = ?",
		);
		stmt.run(enabled ? 1 : 0, new Date().toISOString(), calendarId);
	});

export const updateGoogleCalendarSyncState = (
	calendarId: string,
	syncToken: string | null,
	lastSyncAt: string | null,
) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"UPDATE google_calendars SET sync_token = ?, last_sync_at = ?, updated_at = ? WHERE calendar_id = ?",
		);
		stmt.run(syncToken, lastSyncAt, new Date().toISOString(), calendarId);
	});

export const recordGoogleDeletion = (calendarId: string, eventId: string) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(`
			INSERT INTO google_event_deletions (calendar_id, event_id, deleted_at)
			VALUES (?, ?, ?)
			ON CONFLICT(calendar_id, event_id) DO UPDATE SET
				deleted_at = excluded.deleted_at
		`);
		stmt.run(calendarId, eventId, new Date().toISOString());
	});

export const getGoogleDeletions = (calendarId: string) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"SELECT calendar_id, event_id, deleted_at FROM google_event_deletions WHERE calendar_id = ?",
		);
		return stmt.all(calendarId) as {
			calendar_id: string;
			event_id: string;
			deleted_at: string;
		}[];
	});

export const clearGoogleDeletion = (calendarId: string, eventId: string) =>
	Effect.sync(() => {
		const db = getDatabase();
		const stmt = db.prepare(
			"DELETE FROM google_event_deletions WHERE calendar_id = ? AND event_id = ?",
		);
		stmt.run(calendarId, eventId);
	});

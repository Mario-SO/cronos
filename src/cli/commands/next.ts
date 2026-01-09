import { getAllEvents } from "@features/events/eventsState";
import { formatDateKey } from "@shared/dateUtils";
import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";
import { formatEventLine } from "../format";

const DAY_MINUTES = 24 * 60;

function getEventStartMinutes(event: CalendarEvent): number {
	return event.startTime ?? 0;
}

function getEventEndMinutes(event: CalendarEvent): number {
	if (event.startTime === undefined) return DAY_MINUTES;
	if (event.endTime !== undefined) return event.endTime;
	return event.startTime;
}

function compareEventTime(a: CalendarEvent, b: CalendarEvent): number {
	if (a.date !== b.date) {
		return a.date < b.date ? -1 : 1;
	}
	const startA = getEventStartMinutes(a);
	const startB = getEventStartMinutes(b);
	if (startA !== startB) return startA - startB;
	if (a.title !== b.title) return a.title.localeCompare(b.title);
	return a.id.localeCompare(b.id);
}

export function runNext(): void {
	const allEvents = Effect.runSync(getAllEvents);
	if (allEvents.length === 0) {
		console.log("No events.");
		return;
	}

	const now = new Date();
	const nowKey = formatDateKey(now);
	const nowMinutes = now.getHours() * 60 + now.getMinutes();

	const upcoming = allEvents
		.filter((event) => {
			if (event.date > nowKey) return true;
			if (event.date < nowKey) return false;
			return getEventStartMinutes(event) >= nowMinutes;
		})
		.toSorted(compareEventTime);

	const nextUpcoming = upcoming.at(0);
	if (nextUpcoming) {
		console.log(formatEventLine(nextUpcoming));
		return;
	}

	const ongoing = allEvents
		.filter((event) => {
			if (event.date !== nowKey) return false;
			const start = getEventStartMinutes(event);
			const end = getEventEndMinutes(event);
			return start <= nowMinutes && end >= nowMinutes;
		})
		.toSorted(compareEventTime);

	const nextOngoing = ongoing.at(0);
	if (nextOngoing) {
		console.log(formatEventLine(nextOngoing));
		return;
	}

	console.log("No upcoming events.");
}

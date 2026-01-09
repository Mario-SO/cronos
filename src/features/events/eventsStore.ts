import { SubscriptionRef } from "effect";
import type { CalendarEvent } from "@shared/types";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";

export type EventStore = Map<string, CalendarEvent[]>; // key: YYYY-MM-DD

const initialStore: EventStore = new Map();
export const eventStoreRef = createSubscriptionRef(initialStore);

let eventIdCounter = 0;

export function generateEventId(): string {
	eventIdCounter += 1;
	return `event-${eventIdCounter}-${Date.now()}`;
}

export function restoreEventIdCounter(value: number): void {
	eventIdCounter = value;
}

export function getEventStore(): EventStore {
	return getSubscriptionValue(eventStoreRef);
}

export function useEventStore(): EventStore {
	return useSubscriptionValue(eventStoreRef);
}

export function setEventStore(store: EventStore) {
	return SubscriptionRef.set(eventStoreRef, store);
}

/** Sort events: all-day first, then by start time */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
	return events.toSorted((a, b) => {
		if (a.startTime === undefined && b.startTime === undefined) return 0;
		if (a.startTime === undefined) return -1;
		if (b.startTime === undefined) return 1;
		return a.startTime - b.startTime;
	});
}

/** Group events by date key */
export function groupEventsByDate(events: CalendarEvent[]): EventStore {
	const store: EventStore = new Map();
	for (const event of events) {
		const existing = store.get(event.date) ?? [];
		store.set(event.date, [...existing, event]);
	}
	for (const [dateKey, dayEvents] of store.entries()) {
		store.set(dateKey, sortDayEvents(dayEvents));
	}
	return store;
}

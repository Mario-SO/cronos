import type { CalendarEvent, ColorName } from "@core/types";
import {
	deleteEventById,
	findAllEvents,
	getMaxEventIdCounter,
	insertEvent,
	updateEventById,
} from "@db/repository";
import { recordGoogleDeletion } from "@db/google";
import { MAX_EVENTS } from "@lib/constants";
import { Effect, SubscriptionRef } from "effect";
import { createSubscriptionRef, useSubscriptionValue } from "./store";

type EventStore = Map<string, CalendarEvent[]>; // key: YYYY-MM-DD

const initialStore: EventStore = new Map();

export const eventStoreRef = createSubscriptionRef(initialStore);

let eventIdCounter = 0;

function generateEventId(): string {
	eventIdCounter++;
	return `event-${eventIdCounter}-${Date.now()}`;
}

/** Sort events: all-day first, then by start time */
function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
	return events.toSorted((a, b) => {
		if (a.startTime === undefined && b.startTime === undefined) return 0;
		if (a.startTime === undefined) return -1;
		if (b.startTime === undefined) return 1;
		return a.startTime - b.startTime;
	});
}

/** Group events by date key */
function groupEventsByDate(events: CalendarEvent[]): EventStore {
	const store: EventStore = new Map();
	for (const event of events) {
		const existing = store.get(event.date) ?? [];
		store.set(event.date, [...existing, event]);
	}
	// Sort each day's events
	for (const [dateKey, dayEvents] of store.entries()) {
		store.set(dateKey, sortDayEvents(dayEvents));
	}
	return store;
}

/**
 * Initialize the event store from SQLite.
 * Should be called once at app startup after database initialization.
 */
export const initEventStore = Effect.gen(function* () {
	// Load all events from database
	const events = yield* findAllEvents();
	const store = groupEventsByDate(events);
	yield* SubscriptionRef.set(eventStoreRef, store);

	// Restore the event ID counter to avoid collisions
	const maxCounter = yield* getMaxEventIdCounter();
	eventIdCounter = maxCounter;
});

// Get events for a specific date
export const getEventsForDate = (dateKey: string) =>
	Effect.gen(function* () {
		const store = yield* SubscriptionRef.get(eventStoreRef);
		return store.get(dateKey) ?? [];
	});

// Add a new event
export const addEvent = (
	dateKey: string,
	title: string,
	startTime?: number,
	endTime?: number,
	color: ColorName = "gray",
) =>
	Effect.gen(function* () {
		const store = yield* SubscriptionRef.get(eventStoreRef);

		// Check capacity
		let totalEvents = 0;
		for (const events of store.values()) {
			totalEvents += events.length;
		}
		if (totalEvents >= MAX_EVENTS) {
			return null; // Capacity reached
		}

		const newEvent: CalendarEvent = {
			id: generateEventId(),
			date: dateKey,
			title,
			startTime,
			endTime,
			color,
			updatedAt: new Date().toISOString(),
		};

		// Persist to SQLite
		yield* insertEvent(newEvent);

		// Update in-memory cache
		const newStore = new Map(store);
		const dayEvents = sortDayEvents([
			...(newStore.get(dateKey) ?? []),
			newEvent,
		]);
		newStore.set(dateKey, dayEvents);

		yield* SubscriptionRef.set(eventStoreRef, newStore);
		return newEvent;
	});

// Update an existing event
export const updateEvent = (
	eventId: string,
	updates: Partial<Omit<CalendarEvent, "id">>,
) =>
	Effect.gen(function* () {
		const store = yield* SubscriptionRef.get(eventStoreRef);
		const newStore = new Map(store);
		const nextUpdatedAt = updates.updatedAt ?? new Date().toISOString();

		for (const [dateKey, events] of newStore.entries()) {
			const eventIndex = events.findIndex((e) => e.id === eventId);
			const event = events[eventIndex];
			if (eventIndex !== -1 && event) {
				const updatedEvent = {
					...event,
					...updates,
					updatedAt: nextUpdatedAt,
				};

				// Persist to SQLite
				yield* updateEventById(eventId, {
					...updates,
					updatedAt: nextUpdatedAt,
				});

				// If date changed, move to new date
				if (updates.date && updates.date !== dateKey) {
					// Remove from old date
					const newEvents = events.filter((e) => e.id !== eventId);
					if (newEvents.length === 0) {
						newStore.delete(dateKey);
					} else {
						newStore.set(dateKey, newEvents);
					}
					// Add to new date
					const targetEvents = sortDayEvents([
						...(newStore.get(updates.date) ?? []),
						updatedEvent,
					]);
					newStore.set(updates.date, targetEvents);
				} else {
					// Update in place
					const newEvents = [...events];
					newEvents[eventIndex] = updatedEvent;
					newStore.set(dateKey, sortDayEvents(newEvents));
				}

				yield* SubscriptionRef.set(eventStoreRef, newStore);
				return updatedEvent;
			}
		}

		return null;
	});

// Delete an event
export const deleteEvent = (eventId: string) =>
	Effect.gen(function* () {
		const store = yield* SubscriptionRef.get(eventStoreRef);
		const newStore = new Map(store);

		for (const [dateKey, events] of newStore.entries()) {
			const eventIndex = events.findIndex((e) => e.id === eventId);
			if (eventIndex !== -1) {
				const event = events[eventIndex];
				if (event?.googleCalendarId && event.googleEventId) {
					yield* recordGoogleDeletion(
						event.googleCalendarId,
						event.googleEventId,
					);
				}
				// Persist to SQLite
				yield* deleteEventById(eventId);

				// Update in-memory cache
				const newEvents = events.filter((e) => e.id !== eventId);
				if (newEvents.length === 0) {
					newStore.delete(dateKey);
				} else {
					newStore.set(dateKey, newEvents);
				}
				yield* SubscriptionRef.set(eventStoreRef, newStore);
				return true;
			}
		}

		return false;
	});

// Get all events (for debugging or export)
export const getAllEvents = Effect.gen(function* () {
	const store = yield* SubscriptionRef.get(eventStoreRef);
	const allEvents: CalendarEvent[] = [];
	for (const events of store.values()) {
		allEvents.push(...events);
	}
	return allEvents;
});

// Hook for React components
export function useEventsForDate(dateKey: string): CalendarEvent[] {
	const store = useSubscriptionValue(eventStoreRef);
	return store.get(dateKey) ?? [];
}

export function useEventStore(): EventStore {
	return useSubscriptionValue(eventStoreRef);
}

import { Effect, Ref } from "effect";
import { MAX_EVENTS } from "../lib/constants";
import type { CalendarEvent, ColorName } from "../types";

type EventStore = Map<string, CalendarEvent[]>; // key: YYYY-MM-DD

const initialStore: EventStore = new Map();

export const eventStoreRef = Effect.runSync(Ref.make(initialStore));

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

// Get events for a specific date
export const getEventsForDate = (dateKey: string) =>
	Effect.gen(function* () {
		const store = yield* Ref.get(eventStoreRef);
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
		const store = yield* Ref.get(eventStoreRef);

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
		};

		const newStore = new Map(store);
		const dayEvents = sortDayEvents([
			...(newStore.get(dateKey) ?? []),
			newEvent,
		]);
		newStore.set(dateKey, dayEvents);

		yield* Ref.set(eventStoreRef, newStore);
		return newEvent;
	});

// Update an existing event
export const updateEvent = (
	eventId: string,
	updates: Partial<Omit<CalendarEvent, "id">>,
) =>
	Effect.gen(function* () {
		const store = yield* Ref.get(eventStoreRef);
		const newStore = new Map(store);

		for (const [dateKey, events] of newStore.entries()) {
			const eventIndex = events.findIndex((e) => e.id === eventId);
			const event = events[eventIndex];
			if (eventIndex !== -1 && event) {
				const updatedEvent = { ...event, ...updates };

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

				yield* Ref.set(eventStoreRef, newStore);
				return updatedEvent;
			}
		}

		return null;
	});

// Delete an event
export const deleteEvent = (eventId: string) =>
	Effect.gen(function* () {
		const store = yield* Ref.get(eventStoreRef);
		const newStore = new Map(store);

		for (const [dateKey, events] of newStore.entries()) {
			const eventIndex = events.findIndex((e) => e.id === eventId);
			if (eventIndex !== -1) {
				const newEvents = events.filter((e) => e.id !== eventId);
				if (newEvents.length === 0) {
					newStore.delete(dateKey);
				} else {
					newStore.set(dateKey, newEvents);
				}
				yield* Ref.set(eventStoreRef, newStore);
				return true;
			}
		}

		return false;
	});

// Get all events (for debugging or export)
export const getAllEvents = Effect.gen(function* () {
	const store = yield* Ref.get(eventStoreRef);
	const allEvents: CalendarEvent[] = [];
	for (const events of store.values()) {
		allEvents.push(...events);
	}
	return allEvents;
});

// Hook for React components
export function useEventsForDate(dateKey: string): CalendarEvent[] {
	return Effect.runSync(getEventsForDate(dateKey));
}

export function useEventStore(): EventStore {
	return Effect.runSync(Ref.get(eventStoreRef));
}

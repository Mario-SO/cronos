import { recordGoogleDeletion } from "@features/google/googleDb";
import type { CalendarEvent, ColorName } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";
import { MAX_EVENTS } from "./constants";
import {
	loadAllEvents,
	persistEventCreate,
	persistEventDelete,
	persistEventUpdate,
} from "./eventsService";
import {
	eventStoreRef,
	generateEventId,
	groupEventsByDate,
	setEventStore,
	sortDayEvents,
	useEventStore,
} from "./eventsStore";

/**
 * Initialize the event store from SQLite.
 * Should be called once at app startup after database initialization.
 */
export const initEventStore = Effect.gen(function* () {
	// Load all events from database
	const events = yield* loadAllEvents();
	const store = groupEventsByDate(events);
	yield* setEventStore(store);
});

// Add a new event
export const addEvent = (
	dateKey: string,
	title: string,
	startTime?: number,
	endTime?: number,
	color: ColorName = "gray",
	attendees?: string[],
) =>
	SubscriptionRef.modifyEffect(eventStoreRef, (store) =>
		Effect.gen(function* () {
			// Check capacity
			let totalEvents = 0;
			for (const events of store.values()) {
				totalEvents += events.length;
			}
			if (totalEvents >= MAX_EVENTS) {
				return [null, store] as const; // Capacity reached
			}

			const newEvent: CalendarEvent = {
				id: generateEventId(),
				date: dateKey,
				title,
				startTime,
				endTime,
				color,
				attendees,
				updatedAt: new Date().toISOString(),
			};

			// Persist to SQLite
			yield* persistEventCreate(newEvent);

			// Update in-memory cache
			const newStore = new Map(store);
			const dayEvents = sortDayEvents([
				...(newStore.get(dateKey) ?? []),
				newEvent,
			]);
			newStore.set(dateKey, dayEvents);

			return [newEvent, newStore] as const;
		}),
	);

// Update an existing event
export const updateEvent = (
	eventId: string,
	updates: Partial<Omit<CalendarEvent, "id">>,
) =>
	SubscriptionRef.modifyEffect(eventStoreRef, (store) =>
		Effect.gen(function* () {
			const nextUpdatedAt = updates.updatedAt ?? new Date().toISOString();

			for (const [dateKey, events] of store.entries()) {
				const eventIndex = events.findIndex((e) => e.id === eventId);
				const event = events[eventIndex];
				if (eventIndex !== -1 && event) {
					const updatedEvent = {
						...event,
						...updates,
						updatedAt: nextUpdatedAt,
					};

					// Persist to SQLite
					yield* persistEventUpdate(eventId, {
						...updates,
						updatedAt: nextUpdatedAt,
					});

					const newStore = new Map(store);

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

					return [updatedEvent, newStore] as const;
				}
			}

			return [null, store] as const;
		}),
	);

// Delete an event
export const deleteEvent = (eventId: string) =>
	SubscriptionRef.modifyEffect(eventStoreRef, (store) =>
		Effect.gen(function* () {
			for (const [dateKey, events] of store.entries()) {
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
					yield* persistEventDelete(eventId);

					// Update in-memory cache
					const newStore = new Map(store);
					const newEvents = events.filter((e) => e.id !== eventId);
					if (newEvents.length === 0) {
						newStore.delete(dateKey);
					} else {
						newStore.set(dateKey, newEvents);
					}
					return [true, newStore] as const;
				}
			}

			return [false, store] as const;
		}),
	);

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
	const store = useEventStore();
	return store.get(dateKey) ?? [];
}

export { useEventStore };

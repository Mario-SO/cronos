import {
	deleteEventById,
	findAllEvents,
	insertEvent,
	updateEventById,
} from "@data/repository";
import type { CalendarEvent } from "@shared/types";

export const loadAllEvents = findAllEvents;

export const persistEventCreate = (event: CalendarEvent) => insertEvent(event);

export const persistEventUpdate = (
	id: string,
	updates: Partial<Omit<CalendarEvent, "id">>,
) => updateEventById(id, updates);

export const persistEventDelete = (id: string) => deleteEventById(id);

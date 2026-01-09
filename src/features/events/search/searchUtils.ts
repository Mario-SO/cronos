import type { CalendarEvent } from "@shared/types";
import { parseDateKey } from "@shared/dateUtils";

export type SearchEntry =
	| { type: "event"; event: CalendarEvent }
	| {
			type: "group";
			title: string;
			color: CalendarEvent["color"];
			count: number;
			latest: CalendarEvent;
	  };

/** Fuzzy match score - returns -1 for no match, higher score = better match */
export function fuzzyMatch(query: string, text: string): number {
	const queryLower = query.toLowerCase();
	const textLower = text.toLowerCase();

	if (queryLower.length === 0) return 0;

	let queryIndex = 0;
	let score = 0;
	let consecutiveBonus = 0;

	for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
		if (textLower[i] === queryLower[queryIndex]) {
			score += 1 + consecutiveBonus;
			consecutiveBonus += 1;

			if (i === 0 || textLower[i - 1] === " ") {
				score += 2;
			}

			queryIndex++;
		} else {
			consecutiveBonus = 0;
		}
	}

	if (queryIndex < queryLower.length) return -1;

	return score;
}

export function getEntryEvent(entry: SearchEntry): CalendarEvent {
	return entry.type === "group" ? entry.latest : entry.event;
}

/** Format a date for display */
export function formatEventDate(dateKey: string): string {
	const date = parseDateKey(dateKey);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function groupEventsForSearch(events: CalendarEvent[]): SearchEntry[] {
	const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
	const groups = new Map<string, CalendarEvent[]>();
	for (const event of sorted) {
		const key = `${event.title}::${event.color}`;
		const current = groups.get(key) ?? [];
		current.push(event);
		groups.set(key, current);
	}

	const entries: SearchEntry[] = [];
	for (const groupEvents of groups.values()) {
		if (groupEvents.length === 1) {
			const event = groupEvents[0];
			if (event) entries.push({ type: "event", event });
			continue;
		}
		const latest = groupEvents[0];
		if (!latest) continue;
		entries.push({
			type: "group",
			title: latest.title,
			color: latest.color,
			count: groupEvents.length,
			latest,
		});
	}

	entries.sort((a, b) => {
		const aEvent = getEntryEvent(a);
		const bEvent = getEntryEvent(b);
		return bEvent.date.localeCompare(aEvent.date);
	});

	return entries;
}

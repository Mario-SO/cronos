import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";
import { getAllEvents } from "@features/events/eventsState";
import { formatEventLine } from "../format";
import { parseDateValue } from "../parse";

interface ListOptions {
	date?: string;
	from?: string;
	to?: string;
}

function filterByRange(
	events: CalendarEvent[],
	from: string | null,
	to: string | null,
): CalendarEvent[] {
	if (!from && !to) return events;
	return events.filter((event) => {
		if (from && event.date < from) return false;
		if (to && event.date > to) return false;
		return true;
	});
}

export function runList(options: ListOptions): void {
	const date = parseDateValue(options.date);
	const from = parseDateValue(options.from);
	const to = parseDateValue(options.to);

	if (options.date && !date) {
		console.error("Invalid --date. Use YYYY-MM-DD.");
		process.exitCode = 1;
		return;
	}

	if (options.from && !from) {
		console.error("Invalid --from. Use YYYY-MM-DD.");
		process.exitCode = 1;
		return;
	}

	if (options.to && !to) {
		console.error("Invalid --to. Use YYYY-MM-DD.");
		process.exitCode = 1;
		return;
	}

	if (date && (from || to)) {
		console.error("Use --date or --from/--to, not both.");
		process.exitCode = 1;
		return;
	}
	if (from && to && from > to) {
		console.error("--from must be on or before --to.");
		process.exitCode = 1;
		return;
	}

	const allEvents = Effect.runSync(getAllEvents);
	const filtered = date
		? allEvents.filter((event) => event.date === date)
		: filterByRange(allEvents, from, to);

	if (filtered.length === 0) {
		console.log("No events.");
		return;
	}

	for (const event of filtered) {
		console.log(formatEventLine(event));
	}
}

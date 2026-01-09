import type { CalendarEvent } from "@shared/types";
import { formatTimeRange } from "@shared/dateUtils";

export function formatEventLine(event: CalendarEvent): string {
	const time = formatTimeRange(event.startTime, event.endTime);
	const color = event.color !== "gray" ? ` #${event.color}` : "";
	return `${event.date} ${time} ${event.title}${color} (${event.id})`;
}

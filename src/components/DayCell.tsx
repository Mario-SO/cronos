import { getColorHex, THEME } from "../lib/colors";
import {
	DAY_CELL_EVENT_PREVIEWS,
	DAY_CELL_TITLE_LENGTH,
} from "../lib/constants";
import type { CalendarEvent } from "../types";

interface DayCellProps {
	day: number;
	isToday: boolean;
	isSelected: boolean;
	isCurrentMonth: boolean;
	events: CalendarEvent[];
}

export function DayCell({
	day,
	isToday,
	isSelected,
	isCurrentMonth,
	events,
}: DayCellProps) {
	const maxEventPreviews = DAY_CELL_EVENT_PREVIEWS;
	// If we have more events than maxEventPreviews, we need space for "+x more"
	// Box has height 5, borders take 2, leaving 3 content lines: day + 1 event + "+x more"
	// So when showing "+x more", only display 1 event to fit in 3 lines
	const hasMore = events.length > maxEventPreviews;
	const effectiveMax = hasMore ? 1 : maxEventPreviews;
	const displayEvents = events.slice(0, effectiveMax);
	const moreCount = events.length - effectiveMax;

	const bgColor = isSelected
		? THEME.selected
		: isToday
			? THEME.backgroundAlt
			: undefined;
	const fgColor = !isCurrentMonth
		? THEME.foregroundDim
		: isSelected
			? THEME.background
			: THEME.foreground;
	const borderColor =
		isToday && !isSelected
			? THEME.today
			: isSelected
				? THEME.selected
				: THEME.border;

	return (
		<box
			style={{
				width: 12,
				height: 5,
				border: true,
				borderStyle: "single",
				borderColor,
				backgroundColor: bgColor,
				flexDirection: "column",
				padding: 0,
			}}
		>
			<text fg={fgColor} style={{ marginLeft: 1 }}>
				{String(day).padStart(2, " ")}
			</text>
			{displayEvents.map((event) => (
				<box key={event.id} style={{ flexDirection: "row", marginLeft: 1 }}>
					<text fg={getColorHex(event.color)}>●</text>
					<text
						fg={isSelected ? THEME.background : THEME.foregroundDim}
						style={{ marginLeft: 1 }}
					>
						{event.title.slice(0, DAY_CELL_TITLE_LENGTH)}
					</text>
				</box>
			))}
			{moreCount > 0 && (
				<text fg={THEME.foregroundDim} style={{ marginLeft: 1 }}>
					+{moreCount} more
				</text>
			)}
		</box>
	);
}

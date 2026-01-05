import type { CalendarEvent } from "@core/types";
import { getColorHex, THEME } from "@lib/colors";
import { DAY_CELL_EVENT_PREVIEWS, DAY_CELL_TITLE_LENGTH } from "@lib/constants";

interface DayCellProps {
	day: number;
	isToday: boolean;
	isSelected: boolean;
	isCurrentMonth: boolean;
	events: CalendarEvent[];
	width?: number;
	height?: number;
}

export function DayCell({
	day,
	isToday,
	isSelected,
	isCurrentMonth,
	events,
	width = 12,
	height = 5,
}: DayCellProps) {
	const maxEventPreviews = DAY_CELL_EVENT_PREVIEWS;
	// Calculate how many events we can display based on available height
	// Reserve 1 line for day number, 1 line for "+x more" if needed
	const availableLines = Math.max(1, height - 2); // -2 for borders
	const maxDisplayable = Math.min(
		maxEventPreviews,
		Math.max(1, availableLines - 1),
	);

	const hasMore = events.length > maxDisplayable;
	const effectiveMax = hasMore
		? Math.max(1, maxDisplayable - 1)
		: maxDisplayable;
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
				width,
				height,
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

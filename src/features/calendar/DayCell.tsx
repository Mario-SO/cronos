import { useTheme } from "@features/theme/themeState";
import type { CalendarEvent } from "@shared/types";
import { DAY_CELL_EVENT_PREVIEWS, DAY_CELL_TITLE_LENGTH } from "./constants";

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
	const theme = useTheme();
	const ui = theme.ui;
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
		? ui.selected
		: isToday
			? ui.backgroundAlt
			: undefined;
	const fgColor = !isCurrentMonth
		? ui.foregroundDim
		: isSelected
			? ui.background
			: ui.foreground;
	const borderColor =
		isToday && !isSelected ? ui.today : isSelected ? ui.selected : ui.border;

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
			{displayEvents.map((event) => {
				const linkIndicator = event.conferenceUrl ? " ↗" : "";
				const maxTitleLength = Math.max(
					0,
					DAY_CELL_TITLE_LENGTH - linkIndicator.length,
				);
				const displayTitle = `${event.title.slice(0, maxTitleLength)}${linkIndicator}`;
				return (
					<box key={event.id} style={{ flexDirection: "row", marginLeft: 1 }}>
						<text fg={theme.eventColors[event.color]}>●</text>
						<text
							fg={isSelected ? ui.background : ui.foregroundDim}
							style={{ marginLeft: 1 }}
						>
							{displayTitle}
						</text>
					</box>
				);
			})}
			{moreCount > 0 && (
				<text
					fg={isSelected ? ui.background : ui.foreground}
					style={{ marginLeft: 1 }}
				>
					+{moreCount} more
				</text>
			)}
		</box>
	);
}

import { useTheme } from "@features/theme/themeState";
import type { CalendarEvent } from "@shared/types";
import { DAY_CELL_EVENT_PREVIEWS, DAY_CELL_TITLE_LENGTH } from "./constants";

function formatStartTime24(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	const hourLabel = String(hours).padStart(2, "0");
	if (mins === 0) {
		return `${hourLabel}:00`;
	}
	return `${hourLabel}:${String(mins).padStart(2, "0")}`;
}

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
				const startTimeLabel =
					event.startTime !== undefined
						? formatStartTime24(event.startTime)
						: "";
				const timePrefix = startTimeLabel ? `${startTimeLabel} ` : "";
				const contentWidth = Math.max(0, width - 5);
				const availableForTitle = Math.max(0, contentWidth - timePrefix.length);
				const indicatorFits =
					linkIndicator.length > 0 && availableForTitle >= linkIndicator.length;
				const maxTitleLength = Math.min(
					DAY_CELL_TITLE_LENGTH,
					Math.max(
						0,
						availableForTitle - (indicatorFits ? linkIndicator.length : 0),
					),
				);
				const displayTitle = `${event.title.slice(0, maxTitleLength)}${
					indicatorFits ? linkIndicator : ""
				}`;
				const displayLine = displayTitle
					? `${timePrefix}${displayTitle}`
					: timePrefix.trimEnd();
				return (
					<box key={event.id} style={{ flexDirection: "row", marginLeft: 1 }}>
						<text fg={theme.eventColors[event.color]}>●</text>
						<text
							fg={isSelected ? ui.background : ui.foregroundDim}
							style={{ marginLeft: 1 }}
						>
							{displayLine}
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

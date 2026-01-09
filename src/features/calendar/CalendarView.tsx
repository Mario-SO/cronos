import { buildHelpText } from "@app/commands";
import { useEventStore } from "@features/events/eventsState";
import { useSettings } from "@features/settings/settingsState";
import { useTheme } from "@features/theme/themeState";
import {
	formatDateKey,
	getDaysInMonth,
	getMonthName,
	getWeekdayHeaders,
	getWeekdayOfFirst,
	isSameDay,
} from "@shared/dateUtils";
import { useTerminalSize } from "@shared/hooks/useTerminalSize";
import type { CalendarState } from "@shared/types";
import { DayCell } from "./DayCell";

interface CalendarViewProps {
	state: CalendarState;
	availableWidth?: number;
	availableHeight?: number;
}

export function CalendarView({
	state,
	availableWidth,
	availableHeight,
}: CalendarViewProps) {
	const terminalSize = useTerminalSize();
	const layoutWidth = availableWidth ?? terminalSize.width;
	const layoutHeight = availableHeight ?? terminalSize.height;
	const { displayedMonth, selectedDate } = state;
	const year = displayedMonth.getFullYear();
	const month = displayedMonth.getMonth();
	const today = new Date();
	const settings = useSettings();
	const ui = useTheme().ui;

	// Calculate responsive cell dimensions
	// Reserve space: 1 line for header, 1 line for weekday headers, 1 line for help text
	const gridHeight = layoutHeight - 3;
	const cellHeight = Math.max(3, Math.floor(gridHeight / 6));
	const cellWidth = Math.max(8, Math.floor((layoutWidth - 2) / 7)); // -2 for padding

	const daysInMonth = getDaysInMonth(year, month);
	const firstWeekday = getWeekdayOfFirst(year, month, settings.weekStartDay);
	const weekdayHeaders = getWeekdayHeaders(settings.weekStartDay);

	// Get previous month's days to fill in
	const prevMonth = month === 0 ? 11 : month - 1;
	const prevYear = month === 0 ? year - 1 : year;
	const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

	// Build 6 rows of 7 days each
	const weeks: Array<Array<{ day: number; month: number; year: number }>> = [];
	let currentDay = 1;
	let nextMonthDay = 1;

	// We need to load all events for the visible dates
	const eventStore = useEventStore();

	for (let week = 0; week < 6; week++) {
		const weekDays: Array<{ day: number; month: number; year: number }> = [];

		for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
			if (week === 0 && dayOfWeek < firstWeekday) {
				// Previous month
				const prevDay = daysInPrevMonth - firstWeekday + dayOfWeek + 1;
				weekDays.push({ day: prevDay, month: prevMonth, year: prevYear });
			} else if (currentDay <= daysInMonth) {
				// Current month
				weekDays.push({ day: currentDay, month, year });
				currentDay++;
			} else {
				// Next month
				const nextMonth = month === 11 ? 0 : month + 1;
				const nextYear = month === 11 ? year + 1 : year;
				weekDays.push({ day: nextMonthDay, month: nextMonth, year: nextYear });
				nextMonthDay++;
			}
		}

		weeks.push(weekDays);
	}

	const monthYearHeader = `${getMonthName(month)} ${year}`;
	const helpText = buildHelpText(
		["global"],
		[
			{
				commandIds: [
					"calendar.prevDay",
					"calendar.nextWeek",
					"calendar.prevWeek",
					"calendar.nextDay",
				],
				label: "Days",
				order: ["H", "J", "K", "L"],
			},
			{
				commandIds: ["calendar.prevMonth", "calendar.nextMonth"],
				label: "Months",
				order: ["[", "]"],
			},
			{ commandIds: ["calendar.today"], label: "Today" },
			{ commandIds: ["calendar.toggleYearView"], label: "Year" },
			{ commandIds: ["modal.openAdd"], label: "Add" },
			{ commandIds: ["calendar.toggleAgenda"], label: "Agenda" },
			{ commandIds: ["modal.openSearch"], label: "Search" },
			{ commandIds: ["modal.openGoto"], label: "Go to date" },
		],
	);

	return (
		<box style={{ flexDirection: "column", alignItems: "center" }}>
			{/* Month/Year Header */}
			<box style={{ marginBottom: 1 }}>
				<text fg={ui.foreground}>{monthYearHeader}</text>
			</box>

			{/* Weekday Headers */}
			<box style={{ flexDirection: "row" }}>
				{weekdayHeaders.map((header) => (
					<box
						key={header}
						style={{
							width: cellWidth,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<text fg={ui.foregroundDim}>{header}</text>
					</box>
				))}
			</box>

			{/* Calendar Grid */}
			{weeks.map((week) => {
				const firstDay = week[0];
				const weekKey = firstDay
					? `week-${firstDay.year}-${firstDay.month}-${firstDay.day}`
					: "week";
				return (
					<box key={weekKey} style={{ flexDirection: "row" }}>
						{week.map((dayInfo) => {
							const date = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
							const dateKey = formatDateKey(date);
							const events = eventStore.get(dateKey) ?? [];
							const isCurrentMonth = dayInfo.month === month;
							const isToday = isSameDay(date, today);
							const isSelected = isSameDay(date, selectedDate);

							return (
								<DayCell
									key={dateKey}
									day={dayInfo.day}
									isToday={isToday}
									isSelected={isSelected}
									isCurrentMonth={isCurrentMonth}
									events={events}
									width={cellWidth}
									height={cellHeight}
								/>
							);
						})}
					</box>
				);
			})}

			{/* Help text */}
			{helpText && (
				<box style={{ marginTop: 1 }}>
					<text fg={ui.foregroundDim}>{helpText}</text>
				</box>
			)}
		</box>
	);
}

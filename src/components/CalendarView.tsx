import {
	buildHelpKeyMap,
	getActiveBindings,
	getCommandContext,
	joinHelpKeys,
} from "@core/commands";
import type { CalendarState } from "@core/types";
import { useTerminalSize } from "@hooks/useTerminalSize";
import { THEME } from "@lib/colors";
import {
	formatDateKey,
	getDaysInMonth,
	getMonthName,
	getWeekdayOfFirst,
	isSameDay,
	WEEKDAY_HEADERS,
} from "@lib/dateUtils";
import { useEventStore } from "@state/events";
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

	// Calculate responsive cell dimensions
	// Reserve space: 1 line for header, 1 line for weekday headers, 1 line for help text
	const gridHeight = layoutHeight - 3;
	const cellHeight = Math.max(3, Math.floor(gridHeight / 6));
	const cellWidth = Math.max(8, Math.floor((layoutWidth - 2) / 7)); // -2 for padding

	const daysInMonth = getDaysInMonth(year, month);
	const firstWeekday = getWeekdayOfFirst(year, month);

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
	const ctx = getCommandContext();
	const bindings = getActiveBindings(ctx, { layerIds: ["global"] });
	const keyMap = buildHelpKeyMap(bindings);
	const buildKeys = (commandIds: string[], order?: string[]) =>
		joinHelpKeys(keyMap, commandIds, { order });
	const helpParts: string[] = [];
	const movementKeys = buildKeys(
		[
			"calendar.prevDay",
			"calendar.nextWeek",
			"calendar.prevWeek",
			"calendar.nextDay",
		],
		["H", "J", "K", "L"],
	);
	if (movementKeys) {
		helpParts.push(`${movementKeys} Day movement`);
	}
	const monthKeys = buildKeys(
		["calendar.prevMonth", "calendar.nextMonth"],
		["[", "]"],
	);
	if (monthKeys) {
		helpParts.push(`${monthKeys} Prev/Next Month`);
	}
	const singleBindings = [
		{ id: "calendar.today", label: "Today" },
		{ id: "modal.openAdd", label: "Add" },
		{ id: "calendar.toggleAgenda", label: "Agenda" },
		{ id: "modal.openSearch", label: "Search" },
		{ id: "modal.openGoto", label: "Go to date" },
	];
	for (const binding of singleBindings) {
		const key = buildKeys([binding.id]);
		if (key) {
			helpParts.push(`${key} ${binding.label}`);
		}
	}
	const helpText = helpParts.length > 0 ? helpParts.join(" | ") : "";

	return (
		<box style={{ flexDirection: "column", alignItems: "center" }}>
			{/* Month/Year Header */}
			<box style={{ marginBottom: 1 }}>
				<text fg={THEME.foreground}>{monthYearHeader}</text>
			</box>

			{/* Weekday Headers */}
			<box style={{ flexDirection: "row" }}>
				{WEEKDAY_HEADERS.map((header) => (
					<box
						key={header}
						style={{
							width: cellWidth,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<text fg={THEME.foregroundDim}>{header}</text>
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
					<text fg={THEME.foregroundDim}>{helpText}</text>
				</box>
			)}
		</box>
	);
}

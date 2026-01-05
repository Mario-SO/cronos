import type { CalendarState } from "@core/types";
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
}

export function CalendarView({ state }: CalendarViewProps) {
	const { displayedMonth, selectedDate } = state;
	const year = displayedMonth.getFullYear();
	const month = displayedMonth.getMonth();
	const today = new Date();

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
							width: 12,
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
								/>
							);
						})}
					</box>
				);
			})}

			{/* Help text */}
			<box style={{ marginTop: 1 }}>
				<text fg={THEME.foregroundDim}>
					←/→ Month | H/J/K/L Navigate | T Today | A Add | V View | G Goto
				</text>
			</box>
		</box>
	);
}

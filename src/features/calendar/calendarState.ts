import type { CalendarState } from "@shared/types";
import {
	addDays,
	addMonths,
	getFirstDayOfMonth,
	isSameMonth,
} from "@shared/dateUtils";
import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";

const today = new Date();

const initialCalendarState: CalendarState = {
	displayedMonth: getFirstDayOfMonth(today),
	selectedDate: today,
	viewMode: "month",
	yearGridColumns: 7,
};

// Create ref for calendar state
export const calendarStateRef = createSubscriptionRef(initialCalendarState);

// Calendar navigation effects
export const shiftDisplayedMonth = (months: number) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(calendarStateRef);
		const newMonth = addMonths(state.displayedMonth, months);
		const newSelected = isSameMonth(state.selectedDate, state.displayedMonth)
			? new Date(
					newMonth.getFullYear(),
					newMonth.getMonth(),
					Math.min(
						state.selectedDate.getDate(),
						new Date(
							newMonth.getFullYear(),
							newMonth.getMonth() + 1,
							0,
						).getDate(),
					),
				)
			: state.selectedDate;
		yield* SubscriptionRef.set(calendarStateRef, {
			displayedMonth: newMonth,
			selectedDate: newSelected,
			viewMode: state.viewMode,
			yearGridColumns: state.yearGridColumns,
		});
	});

export const shiftSelectedDate = (days: number) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(calendarStateRef);
		const newDate = addDays(state.selectedDate, days);
		yield* SubscriptionRef.set(calendarStateRef, {
			displayedMonth: isSameMonth(newDate, state.displayedMonth)
				? state.displayedMonth
				: getFirstDayOfMonth(newDate),
			selectedDate: newDate,
			viewMode: state.viewMode,
			yearGridColumns: state.yearGridColumns,
		});
	});

export const goToPreviousMonth = shiftDisplayedMonth(-1);
export const goToNextMonth = shiftDisplayedMonth(1);
export const selectPreviousDay = shiftSelectedDate(-1);
export const selectNextDay = shiftSelectedDate(1);
export const selectPreviousWeek = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(calendarStateRef);
	const step =
		state.viewMode === "year" ? Math.max(1, state.yearGridColumns) : 7;
	const newDate = addDays(state.selectedDate, -step);
	yield* SubscriptionRef.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
		viewMode: state.viewMode,
		yearGridColumns: state.yearGridColumns,
	});
});

export const selectNextWeek = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(calendarStateRef);
	const step =
		state.viewMode === "year" ? Math.max(1, state.yearGridColumns) : 7;
	const newDate = addDays(state.selectedDate, step);
	yield* SubscriptionRef.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
		viewMode: state.viewMode,
		yearGridColumns: state.yearGridColumns,
	});
});

export const jumpToToday = Effect.gen(function* () {
	const now = new Date();
	const state = yield* SubscriptionRef.get(calendarStateRef);
	yield* SubscriptionRef.set(calendarStateRef, {
		displayedMonth: getFirstDayOfMonth(now),
		selectedDate: now,
		viewMode: state.viewMode,
		yearGridColumns: state.yearGridColumns,
	});
});

export const goToDate = (date: Date) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(calendarStateRef);
		yield* SubscriptionRef.set(calendarStateRef, {
			displayedMonth: getFirstDayOfMonth(date),
			selectedDate: date,
			viewMode: state.viewMode,
			yearGridColumns: state.yearGridColumns,
		});
	});

export const toggleCalendarViewMode = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(calendarStateRef);
	const nextView: CalendarState["viewMode"] =
		state.viewMode === "month" ? "year" : "month";
	yield* SubscriptionRef.set(calendarStateRef, {
		displayedMonth: state.displayedMonth,
		selectedDate: state.selectedDate,
		viewMode: nextView,
		yearGridColumns: state.yearGridColumns,
	});
});

export const setYearGridColumns = (columns: number) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(calendarStateRef);
		const nextColumns = Math.max(1, columns);
		if (state.yearGridColumns === nextColumns) return;
		yield* SubscriptionRef.set(calendarStateRef, {
			displayedMonth: state.displayedMonth,
			selectedDate: state.selectedDate,
			viewMode: state.viewMode,
			yearGridColumns: nextColumns,
		});
	});

// Hook for React components
export function useCalendarState(): CalendarState {
	return useSubscriptionValue(calendarStateRef);
}

export function getCalendarState(): CalendarState {
	return getSubscriptionValue(calendarStateRef);
}

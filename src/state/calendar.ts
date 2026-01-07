import type { CalendarState } from "@core/types";
import {
	addDays,
	addMonths,
	getFirstDayOfMonth,
	isSameMonth,
} from "@lib/dateUtils";
import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "./store";

const today = new Date();

const initialCalendarState: CalendarState = {
	displayedMonth: getFirstDayOfMonth(today),
	selectedDate: today,
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
		});
	});

export const goToPreviousMonth = shiftDisplayedMonth(-1);
export const goToNextMonth = shiftDisplayedMonth(1);
export const selectPreviousDay = shiftSelectedDate(-1);
export const selectNextDay = shiftSelectedDate(1);
export const selectPreviousWeek = shiftSelectedDate(-7);
export const selectNextWeek = shiftSelectedDate(7);

export const jumpToToday = Effect.gen(function* () {
	const now = new Date();
	yield* SubscriptionRef.set(calendarStateRef, {
		displayedMonth: getFirstDayOfMonth(now),
		selectedDate: now,
	});
});

export const goToDate = (date: Date) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(calendarStateRef, {
			displayedMonth: getFirstDayOfMonth(date),
			selectedDate: date,
		});
	});

// Hook for React components
export function useCalendarState(): CalendarState {
	return useSubscriptionValue(calendarStateRef);
}

export function getCalendarState(): CalendarState {
	return getSubscriptionValue(calendarStateRef);
}

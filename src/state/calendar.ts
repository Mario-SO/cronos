import type { CalendarState } from "@core/types";
import {
	addDays,
	addMonths,
	getFirstDayOfMonth,
	isSameMonth,
} from "@lib/dateUtils";
import { Effect, Ref } from "effect";

const today = new Date();

const initialCalendarState: CalendarState = {
	displayedMonth: getFirstDayOfMonth(today),
	selectedDate: today,
};

// Create ref for calendar state
export const calendarStateRef = Effect.runSync(Ref.make(initialCalendarState));

// Calendar navigation effects
export const goToPreviousMonth = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newMonth = addMonths(state.displayedMonth, -1);
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
	yield* Ref.set(calendarStateRef, {
		displayedMonth: newMonth,
		selectedDate: newSelected,
	});
});

export const goToNextMonth = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newMonth = addMonths(state.displayedMonth, 1);
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
	yield* Ref.set(calendarStateRef, {
		displayedMonth: newMonth,
		selectedDate: newSelected,
	});
});

export const selectPreviousDay = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newDate = addDays(state.selectedDate, -1);
	yield* Ref.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
	});
});

export const selectNextDay = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newDate = addDays(state.selectedDate, 1);
	yield* Ref.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
	});
});

export const selectPreviousWeek = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newDate = addDays(state.selectedDate, -7);
	yield* Ref.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
	});
});

export const selectNextWeek = Effect.gen(function* () {
	const state = yield* Ref.get(calendarStateRef);
	const newDate = addDays(state.selectedDate, 7);
	yield* Ref.set(calendarStateRef, {
		displayedMonth: isSameMonth(newDate, state.displayedMonth)
			? state.displayedMonth
			: getFirstDayOfMonth(newDate),
		selectedDate: newDate,
	});
});

export const jumpToToday = Effect.gen(function* () {
	const now = new Date();
	yield* Ref.set(calendarStateRef, {
		displayedMonth: getFirstDayOfMonth(now),
		selectedDate: now,
	});
});

export const goToDate = (date: Date) =>
	Effect.gen(function* () {
		yield* Ref.set(calendarStateRef, {
			displayedMonth: getFirstDayOfMonth(date),
			selectedDate: date,
		});
	});

// Hook for React components
export function useCalendarState(): CalendarState {
	return Effect.runSync(Ref.get(calendarStateRef));
}

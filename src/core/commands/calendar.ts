import {
	goToNextMonth,
	goToPreviousMonth,
	jumpToToday,
	selectNextDay,
	selectNextWeek,
	selectPreviousDay,
	selectPreviousWeek,
} from "@state/calendar";
import { toggleAgenda as toggleAgendaState } from "@state/agenda";
import { Effect } from "effect";

export function prevMonth() {
	Effect.runSync(goToPreviousMonth);
}

export function nextMonth() {
	Effect.runSync(goToNextMonth);
}

export function prevDay() {
	Effect.runSync(selectPreviousDay);
}

export function nextDay() {
	Effect.runSync(selectNextDay);
}

export function prevWeek() {
	Effect.runSync(selectPreviousWeek);
}

export function nextWeek() {
	Effect.runSync(selectNextWeek);
}

export function today() {
	Effect.runSync(jumpToToday);
}

export function toggleAgenda() {
	Effect.runSync(toggleAgendaState);
}

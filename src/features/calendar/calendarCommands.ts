import { Effect } from "effect";
import { toggleAgenda as toggleAgendaState } from "@features/agenda/agendaState";
import {
	goToNextMonth,
	goToPreviousMonth,
	jumpToToday,
	selectNextDay,
	selectNextWeek,
	selectPreviousDay,
	selectPreviousWeek,
	toggleCalendarViewMode,
} from "@features/calendar/calendarState";
import { openModal } from "@features/overlays/modalState";
import type { CommandDefinition } from "@app/commands/types";

export const calendarCommands = [
	{
		id: "calendar.prevMonth",
		title: "Last month",
		keys: ["["],
		layers: ["global"],
		run: () => goToPreviousMonth,
	},
	{
		id: "calendar.nextMonth",
		title: "Next month",
		keys: ["]"],
		layers: ["global"],
		run: () => goToNextMonth,
	},
	{
		id: "calendar.prevDay",
		title: "Yesterday",
		keys: ["h"],
		layers: ["global"],
		run: () => selectPreviousDay,
	},
	{
		id: "calendar.nextDay",
		title: "Tomorrow",
		keys: ["l"],
		layers: ["global"],
		run: () => selectNextDay,
	},
	{
		id: "calendar.prevWeek",
		title: "Last week",
		keys: ["k"],
		layers: ["global"],
		run: () => selectPreviousWeek,
	},
	{
		id: "calendar.nextWeek",
		title: "Next week",
		keys: ["j"],
		layers: ["global"],
		run: () => selectNextWeek,
	},
	{
		id: "calendar.today",
		title: "Today",
		keys: ["t"],
		layers: ["global"],
		run: () => jumpToToday,
	},
	{
		id: "calendar.toggleYearView",
		title: "Year view",
		keys: ["y"],
		layers: ["global"],
		run: () => toggleCalendarViewMode,
	},
	{
		id: "calendar.toggleAgenda",
		title: "Agenda",
		keys: ["v"],
		layers: ["global", "agenda"],
		run: () => toggleAgendaState,
	},
	{
		id: "modal.openGoto",
		title: "Go to date",
		keys: ["g"],
		layers: ["global"],
		run: () => openModal("goto"),
	},
	{
		id: "modal.goto.nextField",
		title: "Next field",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.focusNextField();
			}),
	},
	{
		id: "modal.goto.prevField",
		title: "Previous field",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.focusPrevField();
			}),
	},
	{
		id: "modal.goto.submit",
		title: "Go to date",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.submit();
			}),
	},
] as const satisfies readonly CommandDefinition[];

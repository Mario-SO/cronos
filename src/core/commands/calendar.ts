import { toggleAgenda as toggleAgendaState } from "@state/agenda";
import {
	goToNextMonth,
	goToPreviousMonth,
	jumpToToday,
	selectNextDay,
	selectNextWeek,
	selectPreviousDay,
	selectPreviousWeek,
} from "@state/calendar";
import type { CommandDefinition } from "./types";

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
		id: "calendar.toggleAgenda",
		title: "Agenda",
		keys: ["v"],
		layers: ["global", "agenda"],
		run: () => toggleAgendaState,
	},
] as const satisfies readonly CommandDefinition[];

import type { Command } from "../types";
import * as app from "./app";
import * as calendar from "./calendar";
import * as modal from "./modal";

export { app, calendar, modal };

const commandHandlers: Record<Command, () => void> = {
	"calendar.prevMonth": calendar.prevMonth,
	"calendar.nextMonth": calendar.nextMonth,
	"calendar.prevDay": calendar.prevDay,
	"calendar.nextDay": calendar.nextDay,
	"calendar.prevWeek": calendar.prevWeek,
	"calendar.nextWeek": calendar.nextWeek,
	"calendar.today": calendar.today,
	"calendar.toggleAgenda": calendar.toggleAgenda,
	"modal.openAdd": modal.openAdd,
	"modal.openGoto": modal.openGoto,
	"modal.openSearch": modal.openSearch,
	"modal.close": modal.close,
	"app.quit": app.quit,
};

/** Execute a command by its identifier */
export function execute(command: Command): void {
	commandHandlers[command]();
}

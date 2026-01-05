import type { Command } from "../types";
import * as app from "./app";
import * as calendar from "./calendar";
import * as modal from "./modal";

export { app, calendar, modal };

/** Execute a command by its identifier */
export function execute(command: Command): void {
	switch (command) {
		// Calendar
		case "calendar.prevMonth":
			calendar.prevMonth();
			break;
		case "calendar.nextMonth":
			calendar.nextMonth();
			break;
		case "calendar.prevDay":
			calendar.prevDay();
			break;
		case "calendar.nextDay":
			calendar.nextDay();
			break;
		case "calendar.prevWeek":
			calendar.prevWeek();
			break;
		case "calendar.nextWeek":
			calendar.nextWeek();
			break;
		case "calendar.today":
			calendar.today();
			break;

		// Modal
		case "modal.openAdd":
			modal.openAdd();
			break;
		case "modal.openView":
			modal.openView();
			break;
		case "modal.openGoto":
			modal.openGoto();
			break;
		case "modal.openSearch":
			modal.openSearch();
			break;
		case "modal.close":
			modal.close();
			break;

		// App
		case "app.quit":
			app.quit();
			break;
	}
}

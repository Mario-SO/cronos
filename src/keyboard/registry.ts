import type { Shortcut } from "../types";

/**
 * Central registry of all keyboard shortcuts.
 *
 * To add a new shortcut:
 * 1. Add the command to types.ts Command union
 * 2. Implement the command in commands/
 * 3. Add the shortcut entry here
 */
export const shortcuts: Shortcut[] = [
	// Calendar navigation (root scope)
	{ key: "left", command: "calendar.prevMonth", description: "Previous month" },
	{ key: "right", command: "calendar.nextMonth", description: "Next month" },
	{ key: "h", command: "calendar.prevDay", description: "Previous day" },
	{ key: "l", command: "calendar.nextDay", description: "Next day" },
	{ key: "k", command: "calendar.prevWeek", description: "Previous week" },
	{ key: "j", command: "calendar.nextWeek", description: "Next week" },
	{ key: "t", command: "calendar.today", description: "Jump to today" },

	// Modal openers (root scope)
	{ key: "a", command: "modal.openAdd", description: "Add event" },
	{ key: "v", command: "modal.openView", description: "View events" },
	{ key: "g", command: "modal.openGoto", description: "Go to date" },

	// App commands (root scope)
	{ key: "q", command: "app.quit", description: "Quit" },
];

/** Find a shortcut for a given key and scope */
export function findShortcut(key: string, scope: string): Shortcut | undefined {
	// First try to find an exact scope match
	const exactMatch = shortcuts.find((s) => s.key === key && s.scope === scope);
	if (exactMatch) return exactMatch;

	// For root scope, find shortcuts without a scope defined
	if (scope === "root") {
		return shortcuts.find((s) => s.key === key && s.scope === undefined);
	}

	return undefined;
}

/** Get all shortcuts for a given scope (for help display) */
export function getShortcutsForScope(scope: string): Shortcut[] {
	if (scope === "root") {
		return shortcuts.filter((s) => s.scope === undefined || s.scope === "root");
	}
	return shortcuts.filter((s) => s.scope === scope);
}

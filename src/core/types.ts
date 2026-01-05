export type ColorName =
	| "gray"
	| "blue"
	| "green"
	| "red"
	| "yellow"
	| "purple"
	| "orange";

export interface CalendarEvent {
	id: string;
	date: string; // YYYY-MM-DD format
	title: string;
	startTime?: number; // Minutes from midnight (0-1439)
	endTime?: number; // Minutes from midnight (0-1439)
	color: ColorName;
}

export interface CalendarState {
	displayedMonth: Date; // First day of the displayed month
	selectedDate: Date; // Currently selected date
}

export type ModalType = "none" | "add" | "view" | "goto";

export interface ModalState {
	type: ModalType;
	editingEvent?: CalendarEvent; // For edit mode in add modal
}

export interface ParsedEventInput {
	title: string;
	startTime?: number;
	endTime?: number;
	color: ColorName;
}

// Keyboard shortcut system types

/** Scope defines when a shortcut is active */
export type Scope = "root" | "add" | "view" | "goto";

/** All available command identifiers */
export type Command =
	// Calendar navigation
	| "calendar.prevMonth"
	| "calendar.nextMonth"
	| "calendar.prevDay"
	| "calendar.nextDay"
	| "calendar.prevWeek"
	| "calendar.nextWeek"
	| "calendar.today"
	// Modal management
	| "modal.openAdd"
	| "modal.openView"
	| "modal.openGoto"
	| "modal.close"
	// App
	| "app.quit";

/** Shortcut definition linking a key to a command */
export interface Shortcut {
	/** Key name (e.g., "a", "left", "escape") */
	key: string;
	/** Command to execute */
	command: Command;
	/** Scope when shortcut is active (defaults to "root") */
	scope?: Scope;
	/** Human-readable description for help text */
	description: string;
}

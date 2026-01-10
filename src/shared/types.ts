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
	googleEventId?: string;
	googleCalendarId?: string;
	googleEtag?: string;
	conferenceUrl?: string;
	updatedAt?: string; // ISO timestamp
}

export interface CalendarState {
	displayedMonth: Date; // First day of the displayed month
	selectedDate: Date; // Currently selected date
	viewMode: "month" | "year";
	yearGridColumns: number;
}

export type ModalType = "none" | "add" | "goto" | "search" | "settings";

export type WeekStartDay = "monday" | "sunday";

export type ThemeId = string;

export interface Settings {
	version: number;
	weekStartDay: WeekStartDay;
	notificationsEnabled: boolean;
	notificationLeadMinutes: number;
	themeId: ThemeId;
	google: GoogleSettings;
}

export interface GoogleSettings {
	connected: boolean;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiry?: number; // Epoch milliseconds
}

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

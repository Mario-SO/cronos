import type { ColorName } from "@shared/types";

export type FocusArea = "fields" | "actions";
export type NotificationsField = 0 | 1 | 2;
export type WeekStartOptionId = "monday" | "sunday";

export type GoogleOption =
	| {
			type: "action";
			id: "connect" | "sync";
			label: string;
			disabled: boolean;
	  }
	| {
			type: "calendar";
			id: string;
			label: string;
			calendarId: string;
			enabled: boolean;
			color: ColorName;
			canWrite: boolean;
	  };

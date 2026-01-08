import type { WeekStartDay } from "@core/types";

export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getWeekdayOfFirst(
	year: number,
	month: number,
	weekStartDay: WeekStartDay = "monday",
): number {
	const day = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
	return weekStartDay === "sunday" ? day : day === 0 ? 6 : day - 1;
}

export function getWeekdayIndex(
	date: Date,
	weekStartDay: WeekStartDay = "monday",
): number {
	const day = date.getDay();
	return weekStartDay === "sunday" ? day : day === 0 ? 6 : day - 1;
}

export function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
	const parts = key.split("-").map(Number);
	const year = parts[0] ?? 0;
	const month = (parts[1] ?? 1) - 1;
	const day = parts[2] ?? 1;
	return new Date(year, month, day);
}

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function isSameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function addMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}

export function getMonthName(month: number): string {
	const names = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	return names[month] ?? "";
}

export function getShortMonthName(month: number): string {
	const names = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	return names[month] ?? "";
}

export function parseMonthAbbrev(abbrev: string): number | null {
	const normalized = abbrev.toLowerCase().slice(0, 3);
	const months: Record<string, number> = {
		jan: 0,
		feb: 1,
		mar: 2,
		apr: 3,
		may: 4,
		jun: 5,
		jul: 6,
		aug: 7,
		sep: 8,
		oct: 9,
		nov: 10,
		dec: 11,
	};
	return months[normalized] ?? null;
}

export function isValidDate(year: number, month: number, day: number): boolean {
	if (month < 0 || month > 11) return false;
	if (day < 1) return false;
	const daysInMonth = getDaysInMonth(year, month);
	return day <= daysInMonth;
}

export function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	const period = hours >= 12 ? "pm" : "am";
	const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
	if (mins === 0) {
		return `${displayHours}${period}`;
	}
	return `${displayHours}:${String(mins).padStart(2, "0")}${period}`;
}

export function formatTimeRange(start?: number, end?: number): string {
	if (start === undefined) return "All day";
	if (end === undefined) return formatTime(start);
	return `${formatTime(start)}-${formatTime(end)}`;
}

const WEEKDAY_HEADERS_MONDAY = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun",
];

const WEEKDAY_HEADERS_SUNDAY = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
];

const WEEKDAY_COMPACT_LABELS_MONDAY = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_COMPACT_LABELS_SUNDAY = ["S", "M", "T", "W", "T", "F", "S"];

export function getWeekdayHeaders(
	weekStartDay: WeekStartDay = "monday",
): string[] {
	return weekStartDay === "sunday"
		? WEEKDAY_HEADERS_SUNDAY
		: WEEKDAY_HEADERS_MONDAY;
}

export function getWeekdayCompactLabels(
	weekStartDay: WeekStartDay = "monday",
): string[] {
	return weekStartDay === "sunday"
		? WEEKDAY_COMPACT_LABELS_SUNDAY
		: WEEKDAY_COMPACT_LABELS_MONDAY;
}

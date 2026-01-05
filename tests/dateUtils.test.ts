import { describe, expect, test } from "bun:test";
import {
	addDays,
	addMonths,
	formatDateKey,
	formatTime,
	formatTimeRange,
	getDaysInMonth,
	getFirstDayOfMonth,
	getMonthName,
	getShortMonthName,
	getWeekdayOfFirst,
	isSameDay,
	isSameMonth,
	isValidDate,
	parseDateKey,
	parseMonthAbbrev,
} from "../src/lib/dateUtils";

describe("getDaysInMonth", () => {
	test("returns 31 for January", () => {
		expect(getDaysInMonth(2024, 0)).toBe(31);
	});

	test("returns 28 for February in non-leap year", () => {
		expect(getDaysInMonth(2023, 1)).toBe(28);
	});

	test("returns 29 for February in leap year", () => {
		expect(getDaysInMonth(2024, 1)).toBe(29);
	});

	test("returns 30 for April", () => {
		expect(getDaysInMonth(2024, 3)).toBe(30);
	});

	test("returns 31 for December", () => {
		expect(getDaysInMonth(2024, 11)).toBe(31);
	});
});

describe("getFirstDayOfMonth", () => {
	test("returns first day of month", () => {
		const date = new Date(2024, 5, 15); // June 15, 2024
		const result = getFirstDayOfMonth(date);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(5);
		expect(result.getDate()).toBe(1);
	});

	test("returns same date if already first day", () => {
		const date = new Date(2024, 0, 1); // January 1, 2024
		const result = getFirstDayOfMonth(date);
		expect(result.getDate()).toBe(1);
		expect(result.getMonth()).toBe(0);
	});
});

describe("getWeekdayOfFirst", () => {
	test("returns 0-indexed Monday weekday (0 = Monday)", () => {
		// January 1, 2024 was a Monday
		expect(getWeekdayOfFirst(2024, 0)).toBe(0);
	});

	test("returns correct weekday for Sunday (6)", () => {
		// September 1, 2024 was a Sunday
		expect(getWeekdayOfFirst(2024, 8)).toBe(6);
	});

	test("returns correct weekday for mid-week", () => {
		// July 1, 2024 was a Monday
		expect(getWeekdayOfFirst(2024, 6)).toBe(0);
	});
});

describe("formatDateKey", () => {
	test("formats date as YYYY-MM-DD", () => {
		const date = new Date(2024, 5, 15); // June 15, 2024
		expect(formatDateKey(date)).toBe("2024-06-15");
	});

	test("pads single digit month", () => {
		const date = new Date(2024, 0, 5); // January 5, 2024
		expect(formatDateKey(date)).toBe("2024-01-05");
	});

	test("pads single digit day", () => {
		const date = new Date(2024, 11, 1); // December 1, 2024
		expect(formatDateKey(date)).toBe("2024-12-01");
	});
});

describe("parseDateKey", () => {
	test("parses YYYY-MM-DD format", () => {
		const result = parseDateKey("2024-06-15");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(5); // June (0-indexed)
		expect(result.getDate()).toBe(15);
	});

	test("parses single digit month/day", () => {
		const result = parseDateKey("2024-01-05");
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(5);
	});

	test("round-trips with formatDateKey", () => {
		const original = new Date(2024, 7, 23);
		const key = formatDateKey(original);
		const parsed = parseDateKey(key);
		expect(isSameDay(original, parsed)).toBe(true);
	});
});

describe("isSameDay", () => {
	test("returns true for same day", () => {
		const a = new Date(2024, 5, 15, 10, 30);
		const b = new Date(2024, 5, 15, 14, 45);
		expect(isSameDay(a, b)).toBe(true);
	});

	test("returns false for different days", () => {
		const a = new Date(2024, 5, 15);
		const b = new Date(2024, 5, 16);
		expect(isSameDay(a, b)).toBe(false);
	});

	test("returns false for different months", () => {
		const a = new Date(2024, 5, 15);
		const b = new Date(2024, 6, 15);
		expect(isSameDay(a, b)).toBe(false);
	});

	test("returns false for different years", () => {
		const a = new Date(2024, 5, 15);
		const b = new Date(2025, 5, 15);
		expect(isSameDay(a, b)).toBe(false);
	});
});

describe("isSameMonth", () => {
	test("returns true for same month", () => {
		const a = new Date(2024, 5, 1);
		const b = new Date(2024, 5, 30);
		expect(isSameMonth(a, b)).toBe(true);
	});

	test("returns false for different months", () => {
		const a = new Date(2024, 5, 15);
		const b = new Date(2024, 6, 15);
		expect(isSameMonth(a, b)).toBe(false);
	});

	test("returns false for different years same month", () => {
		const a = new Date(2024, 5, 15);
		const b = new Date(2025, 5, 15);
		expect(isSameMonth(a, b)).toBe(false);
	});
});

describe("addDays", () => {
	test("adds positive days", () => {
		const date = new Date(2024, 5, 15);
		const result = addDays(date, 5);
		expect(result.getDate()).toBe(20);
	});

	test("subtracts negative days", () => {
		const date = new Date(2024, 5, 15);
		const result = addDays(date, -5);
		expect(result.getDate()).toBe(10);
	});

	test("crosses month boundary", () => {
		const date = new Date(2024, 5, 30); // June 30
		const result = addDays(date, 5);
		expect(result.getMonth()).toBe(6); // July
		expect(result.getDate()).toBe(5);
	});

	test("does not mutate original date", () => {
		const date = new Date(2024, 5, 15);
		addDays(date, 5);
		expect(date.getDate()).toBe(15);
	});
});

describe("addMonths", () => {
	test("adds positive months", () => {
		const date = new Date(2024, 5, 15); // June
		const result = addMonths(date, 2);
		expect(result.getMonth()).toBe(7); // August
	});

	test("subtracts negative months", () => {
		const date = new Date(2024, 5, 15); // June
		const result = addMonths(date, -2);
		expect(result.getMonth()).toBe(3); // April
	});

	test("crosses year boundary forward", () => {
		const date = new Date(2024, 11, 15); // December
		const result = addMonths(date, 2);
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(1); // February
	});

	test("crosses year boundary backward", () => {
		const date = new Date(2024, 1, 15); // February
		const result = addMonths(date, -3);
		expect(result.getFullYear()).toBe(2023);
		expect(result.getMonth()).toBe(10); // November
	});

	test("does not mutate original date", () => {
		const date = new Date(2024, 5, 15);
		addMonths(date, 2);
		expect(date.getMonth()).toBe(5);
	});
});

describe("getMonthName", () => {
	test("returns full month names", () => {
		const expected = [
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
		expected.forEach((name, i) => {
			expect(getMonthName(i)).toBe(name);
		});
	});

	test("returns empty string for invalid month", () => {
		expect(getMonthName(12)).toBe("");
		expect(getMonthName(-1)).toBe("");
	});
});

describe("getShortMonthName", () => {
	test("returns abbreviated month names", () => {
		const expected = [
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
		expected.forEach((name, i) => {
			expect(getShortMonthName(i)).toBe(name);
		});
	});

	test("returns empty string for invalid month", () => {
		expect(getShortMonthName(12)).toBe("");
	});
});

describe("parseMonthAbbrev", () => {
	test("parses 3-letter abbreviations", () => {
		const abbrevs = [
			"jan",
			"feb",
			"mar",
			"apr",
			"may",
			"jun",
			"jul",
			"aug",
			"sep",
			"oct",
			"nov",
			"dec",
		];
		abbrevs.forEach((abbrev, i) => {
			expect(parseMonthAbbrev(abbrev)).toBe(i);
		});
	});

	test("parses full month names", () => {
		expect(parseMonthAbbrev("January")).toBe(0);
		expect(parseMonthAbbrev("December")).toBe(11);
	});

	test("is case insensitive", () => {
		expect(parseMonthAbbrev("JAN")).toBe(0);
		expect(parseMonthAbbrev("Jan")).toBe(0);
		expect(parseMonthAbbrev("jAn")).toBe(0);
	});

	test("returns null for invalid abbreviation", () => {
		expect(parseMonthAbbrev("xyz")).toBeNull();
		expect(parseMonthAbbrev("")).toBeNull();
	});
});

describe("isValidDate", () => {
	test("returns true for valid dates", () => {
		expect(isValidDate(2024, 0, 1)).toBe(true);
		expect(isValidDate(2024, 5, 15)).toBe(true);
		expect(isValidDate(2024, 11, 31)).toBe(true);
	});

	test("returns false for invalid month", () => {
		expect(isValidDate(2024, -1, 15)).toBe(false);
		expect(isValidDate(2024, 12, 15)).toBe(false);
	});

	test("returns false for invalid day", () => {
		expect(isValidDate(2024, 5, 0)).toBe(false);
		expect(isValidDate(2024, 5, 31)).toBe(false); // June has 30 days
	});

	test("validates leap year February", () => {
		expect(isValidDate(2024, 1, 29)).toBe(true); // leap year
		expect(isValidDate(2023, 1, 29)).toBe(false); // not leap year
	});
});

describe("formatTime", () => {
	test("formats morning times", () => {
		expect(formatTime(9 * 60)).toBe("9am");
		expect(formatTime(9 * 60 + 30)).toBe("9:30am");
	});

	test("formats afternoon times", () => {
		expect(formatTime(14 * 60)).toBe("2pm");
		expect(formatTime(14 * 60 + 45)).toBe("2:45pm");
	});

	test("formats midnight", () => {
		expect(formatTime(0)).toBe("12am");
	});

	test("formats noon", () => {
		expect(formatTime(12 * 60)).toBe("12pm");
	});

	test("formats minutes with leading zero", () => {
		expect(formatTime(9 * 60 + 5)).toBe("9:05am");
	});
});

describe("formatTimeRange", () => {
	test("returns 'All day' when no start time", () => {
		expect(formatTimeRange(undefined, undefined)).toBe("All day");
	});

	test("returns single time when no end time", () => {
		expect(formatTimeRange(9 * 60)).toBe("9am");
	});

	test("formats full range", () => {
		expect(formatTimeRange(9 * 60, 10 * 60)).toBe("9am-10am");
		expect(formatTimeRange(14 * 60, 16 * 60 + 30)).toBe("2pm-4:30pm");
	});
});

import { COLOR_NAMES, getColorByIndex } from "@shared/colors";
import { formatTime } from "@shared/dateUtils";
import type { ColorName, ParsedEventInput } from "@shared/types";

// Parse time like "2pm", "2:30pm", "14:00", "14"
function parseTimeString(str: string): number | null {
	str = str.toLowerCase().trim();

	// Match patterns like "2pm", "2:30pm", "14:00", "14"
	const match12h = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
	if (match12h) {
		let hours = parseInt(match12h[1] ?? "0", 10);
		const minutes = match12h[2] ? parseInt(match12h[2], 10) : 0;
		const period = (match12h[3] ?? "am").toLowerCase();

		if (hours < 1 || hours > 12) return null;
		if (minutes < 0 || minutes > 59) return null;

		if (period === "pm" && hours !== 12) hours += 12;
		if (period === "am" && hours === 12) hours = 0;

		return hours * 60 + minutes;
	}

	// Match 24h format like "14:00" or "14"
	const match24h = str.match(/^(\d{1,2})(?::(\d{2}))?$/);
	if (match24h) {
		const hours = parseInt(match24h[1] ?? "0", 10);
		const minutes = match24h[2] ? parseInt(match24h[2], 10) : 0;

		if (hours < 0 || hours > 23) return null;
		if (minutes < 0 || minutes > 59) return null;

		return hours * 60 + minutes;
	}

	return null;
}

// Parse time range like "2-3pm", "2pm-3pm", "2pm-3:30pm", "14:00-15:00"
function parseTimeRange(
	str: string,
): { start: number; end: number } | { start: number } | null {
	str = str.toLowerCase().trim();

	// Check for range pattern with hyphen
	const hyphenIndex = str.indexOf("-");
	if (hyphenIndex === -1) {
		// Single time
		const time = parseTimeString(str);
		if (time !== null) {
			return { start: time };
		}
		return null;
	}

	const startPart = str.slice(0, hyphenIndex).trim();
	const endPart = str.slice(hyphenIndex + 1).trim();

	// Try to parse end time first
	const endTime = parseTimeString(endPart);
	if (endTime === null) return null;

	// Check if start part lacks am/pm - if so, inherit from end
	const startHasAmPm = /(?:am|pm)$/i.test(startPart);
	let startTime: number | null = null;

	if (!startHasAmPm) {
		// Try inheriting am/pm from end (e.g., "2-3pm" → "2pm-3pm")
		const endPeriod = endPart.match(/(am|pm)$/i);
		if (endPeriod) {
			startTime = parseTimeString(startPart + endPeriod[1]);
		}
	}

	// If inheritance didn't work or wasn't needed, parse as-is
	if (startTime === null) {
		startTime = parseTimeString(startPart);
	}

	if (startTime === null) return null;

	// Reject inverted ranges (end before start)
	if (endTime < startTime) return null;

	return { start: startTime, end: endTime };
}

// Parse color like "#blue", "#0", "#gray"
function parseColor(str: string): ColorName | null {
	if (!str.startsWith("#")) return null;

	const value = str.slice(1).toLowerCase();

	// Check if it's a number
	const num = parseInt(value, 10);
	if (!Number.isNaN(num) && num >= 0 && num <= 6) {
		return getColorByIndex(num);
	}

	// Check if it's a color name
	if (COLOR_NAMES.includes(value as ColorName)) {
		return value as ColorName;
	}

	return null;
}

export function parseEventInput(input: string): ParsedEventInput {
	let remaining = input.trim();
	let color: ColorName = "gray";
	let startTime: number | undefined;
	let endTime: number | undefined;
	let googleMeet = false;

	const tokens = remaining.split(/\s+/).filter(Boolean);
	if (tokens.length > 0) {
		const filtered: string[] = [];
		for (const token of tokens) {
			if (/^!g$/i.test(token)) {
				googleMeet = true;
				continue;
			}
			filtered.push(token);
		}
		remaining = filtered.join(" ").trim();
	}

	// Extract color (from the end)
	const colorMatch = remaining.match(/#\w+\s*$/);
	if (colorMatch) {
		const parsed = parseColor(colorMatch[0].trim());
		if (parsed) {
			color = parsed;
			remaining = remaining.slice(0, colorMatch.index).trim();
		}
	}

	// Extract time/time-range (look for patterns anywhere)
	// Common patterns: standalone time like "2pm" or range like "2-3pm", "2pm-3pm"
	const timePatterns = [
		// Range with both am/pm: "2pm-3pm", "2:30pm-3:30pm"
		/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
		// Range with end am/pm: "2-3pm", "2:30-3:30pm"
		/\b(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
		// 24h range: "14:00-15:00"
		/\b(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\b/,
		// Single time with am/pm: "2pm", "2:30pm"
		/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
		// Single 24h time: "14:00"
		/\b(\d{1,2}:\d{2})\b/,
	];

	for (const pattern of timePatterns) {
		const match = remaining.match(pattern);
		if (match) {
			const fullMatch = match[0];
			const parsed = parseTimeRange(fullMatch);
			if (parsed) {
				startTime = parsed.start;
				if ("end" in parsed) {
					endTime = parsed.end;
				}
				remaining = remaining
					.replace(fullMatch, " ")
					.replace(/\s+/g, " ")
					.trim();
				break;
			}
		}
	}

	return {
		title: remaining || "",
		startTime,
		endTime,
		color,
		googleMeet,
	};
}

// Reconstruct input string from event for editing
export function reconstructEventInput(event: {
	title: string;
	startTime?: number;
	endTime?: number;
	color: ColorName;
	googleMeet?: boolean;
	conferenceUrl?: string;
}): string {
	const parts: string[] = [event.title];
	const includeMeet = event.googleMeet ?? Boolean(event.conferenceUrl);

	if (event.startTime !== undefined) {
		if (event.endTime !== undefined) {
			parts.push(`${formatTime(event.startTime)}-${formatTime(event.endTime)}`);
		} else {
			parts.push(formatTime(event.startTime));
		}
	}

	if (event.color !== "gray") {
		parts.push(`#${event.color}`);
	}

	if (includeMeet) {
		parts.push("!g");
	}

	return parts.join(" ");
}

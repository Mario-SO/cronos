import { describe, expect, test } from "bun:test";
import {
	parseEventInput,
	reconstructEventInput,
} from "@features/events/eventParser";

describe("parseEventInput", () => {
	describe("title extraction", () => {
		test("parses simple title", () => {
			const result = parseEventInput("Team meeting");
			expect(result.title).toBe("Team meeting");
			expect(result.color).toBe("gray");
		});

		test("preserves title with special characters", () => {
			const result = parseEventInput("Q&A Session: What's next?");
			expect(result.title).toBe("Q&A Session: What's next?");
		});

		test("handles empty input", () => {
			const result = parseEventInput("");
			expect(result.title).toBe("");
			expect(result.color).toBe("gray");
		});

		test("handles whitespace-only input", () => {
			const result = parseEventInput("   ");
			expect(result.title).toBe("");
		});
	});

	describe("time parsing - 12-hour format", () => {
		test("parses simple time like 2pm", () => {
			const result = parseEventInput("Meeting 2pm");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60); // 840 minutes
			expect(result.endTime).toBeUndefined();
		});

		test("parses time with minutes like 2:30pm", () => {
			const result = parseEventInput("Meeting 2:30pm");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60 + 30); // 870 minutes
		});

		test("parses morning time like 9am", () => {
			const result = parseEventInput("Standup 9am");
			expect(result.title).toBe("Standup");
			expect(result.startTime).toBe(9 * 60); // 540 minutes
		});

		test("parses 12am as midnight", () => {
			const result = parseEventInput("Midnight event 12am");
			expect(result.title).toBe("Midnight event");
			expect(result.startTime).toBe(0);
		});

		test("parses 12pm as noon", () => {
			const result = parseEventInput("Lunch 12pm");
			expect(result.title).toBe("Lunch");
			expect(result.startTime).toBe(12 * 60); // 720 minutes
		});

		test("handles uppercase AM/PM", () => {
			const result = parseEventInput("Meeting 3PM");
			expect(result.startTime).toBe(15 * 60);
		});
	});

	describe("time parsing - 24-hour format", () => {
		test("parses 24h format like 14:00", () => {
			const result = parseEventInput("Meeting 14:00");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60);
		});

		test("parses 24h format with minutes like 14:30", () => {
			const result = parseEventInput("Meeting 14:30");
			expect(result.startTime).toBe(14 * 60 + 30);
		});

		test("parses midnight 00:00", () => {
			const result = parseEventInput("Late night 00:00");
			expect(result.startTime).toBe(0);
		});

		test("parses 23:59", () => {
			const result = parseEventInput("Almost midnight 23:59");
			expect(result.startTime).toBe(23 * 60 + 59);
		});
	});

	describe("time range parsing", () => {
		test("parses range with both am/pm like 2pm-3pm", () => {
			const result = parseEventInput("Meeting 2pm-3pm");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60);
			expect(result.endTime).toBe(15 * 60);
		});

		test("parses range with shared pm like 2-3pm", () => {
			const result = parseEventInput("Meeting 2-3pm");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60);
			expect(result.endTime).toBe(15 * 60);
		});

		test("parses range with minutes like 2:30pm-3:30pm", () => {
			const result = parseEventInput("Meeting 2:30pm-3:30pm");
			expect(result.startTime).toBe(14 * 60 + 30);
			expect(result.endTime).toBe(15 * 60 + 30);
		});

		test("parses morning range like 9am-10am", () => {
			const result = parseEventInput("Standup 9am-10am");
			expect(result.startTime).toBe(9 * 60);
			expect(result.endTime).toBe(10 * 60);
		});

		test("parses 24h range like 14:00-15:00", () => {
			const result = parseEventInput("Meeting 14:00-15:00");
			expect(result.startTime).toBe(14 * 60);
			expect(result.endTime).toBe(15 * 60);
		});

		test("parses range crossing noon like 11am-1pm", () => {
			const result = parseEventInput("Lunch 11am-1pm");
			expect(result.startTime).toBe(11 * 60);
			expect(result.endTime).toBe(13 * 60);
		});

		test("rejects inverted ranges (end before start)", () => {
			const result = parseEventInput("Bad range 3pm-2pm");
			// Should not parse the range, treating it as part of title or ignoring
			expect(result.endTime).toBeUndefined();
		});
	});

	describe("color parsing", () => {
		test("parses color name like #blue", () => {
			const result = parseEventInput("Meeting #blue");
			expect(result.title).toBe("Meeting");
			expect(result.color).toBe("blue");
		});

		test("parses gray color", () => {
			const result = parseEventInput("Event #gray");
			expect(result.color).toBe("gray");
		});

		test("parses blue color", () => {
			const result = parseEventInput("Event #blue");
			expect(result.color).toBe("blue");
		});

		test("parses green color", () => {
			const result = parseEventInput("Event #green");
			expect(result.color).toBe("green");
		});

		test("parses red color", () => {
			const result = parseEventInput("Event #red");
			expect(result.color).toBe("red");
		});

		test("parses yellow color", () => {
			const result = parseEventInput("Event #yellow");
			expect(result.color).toBe("yellow");
		});

		test("parses purple color", () => {
			const result = parseEventInput("Event #purple");
			expect(result.color).toBe("purple");
		});

		test("parses orange color", () => {
			const result = parseEventInput("Event #orange");
			expect(result.color).toBe("orange");
		});

		test("parses color by index like #0", () => {
			const result = parseEventInput("Meeting #0");
			expect(result.color).toBe("gray"); // Index 0 = gray
		});

		test("parses color by index #0", () => {
			const result = parseEventInput("Event #0");
			expect(result.color).toBe("gray");
		});

		test("parses color by index #1", () => {
			const result = parseEventInput("Event #1");
			expect(result.color).toBe("blue");
		});

		test("parses color by index #2", () => {
			const result = parseEventInput("Event #2");
			expect(result.color).toBe("green");
		});

		test("parses color by index #3", () => {
			const result = parseEventInput("Event #3");
			expect(result.color).toBe("red");
		});

		test("parses color by index #4", () => {
			const result = parseEventInput("Event #4");
			expect(result.color).toBe("yellow");
		});

		test("parses color by index #5", () => {
			const result = parseEventInput("Event #5");
			expect(result.color).toBe("purple");
		});

		test("parses color by index #6", () => {
			const result = parseEventInput("Event #6");
			expect(result.color).toBe("orange");
		});

		test("defaults to gray for unknown color", () => {
			const result = parseEventInput("Meeting #unknown");
			expect(result.color).toBe("gray");
			expect(result.title).toBe("Meeting #unknown");
		});

		test("defaults to gray for invalid index", () => {
			const result = parseEventInput("Meeting #99");
			expect(result.color).toBe("gray");
		});
	});

	describe("combined parsing", () => {
		test("parses title + time + color", () => {
			const result = parseEventInput("Team standup 9am #green");
			expect(result.title).toBe("Team standup");
			expect(result.startTime).toBe(9 * 60);
			expect(result.color).toBe("green");
		});

		test("parses title + time range + color", () => {
			const result = parseEventInput("Workshop 2pm-4pm #purple");
			expect(result.title).toBe("Workshop");
			expect(result.startTime).toBe(14 * 60);
			expect(result.endTime).toBe(16 * 60);
			expect(result.color).toBe("purple");
		});

		test("parses time at start of input", () => {
			const result = parseEventInput("9am Daily standup");
			expect(result.title).toBe("Daily standup");
			expect(result.startTime).toBe(9 * 60);
		});

		test("parses time in middle of input", () => {
			const result = parseEventInput("Call with 2pm team");
			expect(result.title).toBe("Call with team");
			expect(result.startTime).toBe(14 * 60);
		});

		test("handles only time (no title)", () => {
			const result = parseEventInput("2pm #blue");
			expect(result.title).toBe("");
			expect(result.startTime).toBe(14 * 60);
			expect(result.color).toBe("blue");
		});

		test("handles only color (no title)", () => {
			const result = parseEventInput("#red");
			expect(result.title).toBe("");
			expect(result.color).toBe("red");
		});
	});

	describe("edge cases", () => {
		test("handles multiple spaces", () => {
			const result = parseEventInput("Team   meeting   2pm");
			expect(result.title).toBe("Team meeting");
			expect(result.startTime).toBe(14 * 60);
		});

		test("handles leading/trailing whitespace", () => {
			const result = parseEventInput("  Meeting 2pm  ");
			expect(result.title).toBe("Meeting");
			expect(result.startTime).toBe(14 * 60);
		});

		test("handles title with numbers", () => {
			const result = parseEventInput("Q3 Review meeting");
			expect(result.title).toBe("Q3 Review meeting");
		});

		test("does not confuse year-like numbers with time", () => {
			const result = parseEventInput("Plan for 2024");
			expect(result.title).toBe("Plan for 2024");
			expect(result.startTime).toBeUndefined();
		});
	});
});

describe("reconstructEventInput", () => {
	test("reconstructs title only", () => {
		const result = reconstructEventInput({
			title: "Team meeting",
			color: "gray",
		});
		expect(result).toBe("Team meeting");
	});

	test("reconstructs title with time", () => {
		const result = reconstructEventInput({
			title: "Team meeting",
			startTime: 14 * 60, // 2pm
			color: "gray",
		});
		expect(result).toBe("Team meeting 2pm");
	});

	test("reconstructs title with time range", () => {
		const result = reconstructEventInput({
			title: "Workshop",
			startTime: 14 * 60, // 2pm
			endTime: 16 * 60, // 4pm
			color: "gray",
		});
		expect(result).toBe("Workshop 2pm-4pm");
	});

	test("reconstructs title with color", () => {
		const result = reconstructEventInput({
			title: "Important meeting",
			color: "red",
		});
		expect(result).toBe("Important meeting #red");
	});

	test("reconstructs title with time and color", () => {
		const result = reconstructEventInput({
			title: "Standup",
			startTime: 9 * 60, // 9am
			color: "green",
		});
		expect(result).toBe("Standup 9am #green");
	});

	test("reconstructs full event", () => {
		const result = reconstructEventInput({
			title: "Planning",
			startTime: 10 * 60, // 10am
			endTime: 11 * 60 + 30, // 11:30am
			color: "blue",
		});
		expect(result).toBe("Planning 10am-11:30am #blue");
	});

	test("formats time with minutes correctly", () => {
		const result = reconstructEventInput({
			title: "Meeting",
			startTime: 14 * 60 + 30, // 2:30pm
			color: "gray",
		});
		expect(result).toBe("Meeting 2:30pm");
	});

	test("formats midnight correctly", () => {
		const result = reconstructEventInput({
			title: "Late event",
			startTime: 0, // 12am
			color: "gray",
		});
		expect(result).toBe("Late event 12am");
	});

	test("formats noon correctly", () => {
		const result = reconstructEventInput({
			title: "Lunch",
			startTime: 12 * 60, // 12pm
			color: "gray",
		});
		expect(result).toBe("Lunch 12pm");
	});

	test("does not include gray color in output", () => {
		const result = reconstructEventInput({
			title: "Meeting",
			startTime: 14 * 60,
			endTime: 15 * 60,
			color: "gray",
		});
		expect(result).not.toContain("#gray");
	});
});

describe("round-trip parsing", () => {
	test("parse and reconstruct preserves data", () => {
		const inputs = [
			"Team meeting 2pm #blue",
			"Standup 9am-10am #green",
			"Quick call 3:30pm",
			"All day event #red",
			"Simple event",
		];

		for (const input of inputs) {
			const parsed = parseEventInput(input);
			const reconstructed = reconstructEventInput(parsed);
			const reparsed = parseEventInput(reconstructed);

			// Compare the entire parsed result
			expect(reparsed).toEqual(parsed);
		}
	});
});

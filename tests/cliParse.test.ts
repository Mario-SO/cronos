import { describe, expect, test } from "bun:test";
import { parseArgs, parseDateValue } from "../src/cli/parse";

describe("parseArgs", () => {
	test("parses command, flags, and positionals", () => {
		const result = parseArgs([
			"add",
			"--date",
			"2025-04-10",
			"Lunch",
			"12pm-1pm",
		]);

		expect(result.command).toBe("add");
		expect(result.flags.date).toBe("2025-04-10");
		expect(result.positionals).toEqual(["Lunch", "12pm-1pm"]);
	});

	test("parses inline flag values", () => {
		const result = parseArgs(["list", "--date=2025-04-10"]);
		expect(result.command).toBe("list");
		expect(result.flags.date).toBe("2025-04-10");
	});

	test("parses short help flag", () => {
		const result = parseArgs(["-h"]);
		expect(result.command).toBeUndefined();
		expect(result.flags.help).toBe(true);
	});
});

describe("parseDateValue", () => {
	test("accepts valid dates", () => {
		expect(parseDateValue("2025-04-10")).toBe("2025-04-10");
		expect(parseDateValue("2024-02-29")).toBe("2024-02-29");
	});

	test("rejects invalid dates", () => {
		expect(parseDateValue("2024-02-30")).toBeNull();
		expect(parseDateValue("2024-13-01")).toBeNull();
		expect(parseDateValue("2024-1-01")).toBeNull();
	});
});

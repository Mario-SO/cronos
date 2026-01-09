import { describe, expect, test } from "bun:test";
import { COLOR_NAMES, getColorByIndex } from "@shared/colors";
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from "@shared/themes";
import type { ColorName } from "@shared/types";

const theme = BUILTIN_THEMES[DEFAULT_THEME_ID];
if (!theme) {
	throw new Error(`Missing builtin theme: ${DEFAULT_THEME_ID}`);
}
const COLORS = theme.eventColors;
const THEME = theme.ui;
const getColorHex = (name: ColorName) => COLORS[name];

describe("COLOR_NAMES", () => {
	test("contains all 7 colors", () => {
		expect(COLOR_NAMES).toHaveLength(7);
	});

	test("contains expected colors in order", () => {
		expect(COLOR_NAMES).toEqual([
			"gray",
			"blue",
			"green",
			"red",
			"yellow",
			"purple",
			"orange",
		]);
	});
});

describe("COLORS", () => {
	test("has hex values for all color names", () => {
		for (const name of COLOR_NAMES) {
			expect(COLORS[name]).toBeDefined();
			expect(COLORS[name]).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	test("contains expected hex values (Cursor Dark theme)", () => {
		expect(COLORS.gray).toBe("#505050");
		expect(COLORS.blue).toBe("#85C1FC");
		expect(COLORS.green).toBe("#A3BE8C");
		expect(COLORS.red).toBe("#BF616A");
		expect(COLORS.yellow).toBe("#EBC88D");
		expect(COLORS.purple).toBe("#AA9BF5");
		expect(COLORS.orange).toBe("#EFB080");
	});
});

describe("getColorByIndex", () => {
	test("returns correct color for indices 0-6", () => {
		expect(getColorByIndex(0)).toBe("gray");
		expect(getColorByIndex(1)).toBe("blue");
		expect(getColorByIndex(2)).toBe("green");
		expect(getColorByIndex(3)).toBe("red");
		expect(getColorByIndex(4)).toBe("yellow");
		expect(getColorByIndex(5)).toBe("purple");
		expect(getColorByIndex(6)).toBe("orange");
	});

	test("wraps around for indices > 6", () => {
		expect(getColorByIndex(7)).toBe("gray");
		expect(getColorByIndex(8)).toBe("blue");
		expect(getColorByIndex(14)).toBe("gray"); // 14 % 7 = 0
	});

	test("handles negative indices gracefully", () => {
		// JavaScript modulo with negative numbers can return negative
		// The function should still return a valid color
		const result = getColorByIndex(-1);
		expect(COLOR_NAMES).toContain(result);
	});
});

describe("getColorHex", () => {
	test("returns hex for all color names", () => {
		for (const name of COLOR_NAMES) {
			const hex = getColorHex(name);
			expect(hex).toBe(COLORS[name]);
		}
	});

	test("returns correct hex values", () => {
		expect(getColorHex("blue")).toBe("#85C1FC");
		expect(getColorHex("red")).toBe("#BF616A");
	});
});

describe("THEME", () => {
	test("has all required theme properties", () => {
		expect(THEME.background).toBeDefined();
		expect(THEME.backgroundAlt).toBeDefined();
		expect(THEME.foreground).toBeDefined();
		expect(THEME.foregroundDim).toBeDefined();
		expect(THEME.border).toBeDefined();
		expect(THEME.borderHighlight).toBeDefined();
		expect(THEME.today).toBeDefined();
		expect(THEME.selected).toBeDefined();
		expect(THEME.error).toBeDefined();
	});

	test("theme values are valid hex colors", () => {
		for (const [_, value] of Object.entries(THEME)) {
			expect(value).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});

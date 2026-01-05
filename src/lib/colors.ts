import type { ColorName } from "../types";

// Cursor Dark theme
export const COLORS: Record<ColorName, string> = {
	gray: "#505050",
	blue: "#85C1FC",
	green: "#A3BE8C",
	red: "#BF616A",
	yellow: "#EBC88D",
	purple: "#AA9BF5",
	orange: "#EFB080",
};

export const COLOR_NAMES: ColorName[] = [
	"gray",
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
];

export function getColorByIndex(index: number): ColorName {
	return COLOR_NAMES[index % COLOR_NAMES.length] ?? "gray";
}

export function getColorHex(name: ColorName): string {
	return COLORS[name];
}

// Cursor Dark theme for the UI
export const THEME = {
	// Backgrounds
	background: "#141414",
	backgroundAlt: "#1F1F1F",
	backgroundDark: "#2A2A2A",
	selection: "#2E2E2E",

	// Foregrounds
	foreground: "#D8DEE9",
	foregroundDim: "#505050",

	// Borders
	border: "#2A2A2A",
	borderHighlight: "#87C3FF",

	// Semantic colors
	today: "#A3BE8C",
	selected: "#85C1FC",
	cursor: "#87C3FF",
	error: "#BF616A",
	warning: "#EBC88D",
	success: "#A3BE8C",
	info: "#88C0D0",

	// Accent colors
	accent: "#AA9BF5",
	accentAlt: "#C582BF",
	cyan: "#83D6C5",
};

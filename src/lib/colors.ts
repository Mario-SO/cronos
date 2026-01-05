import type { ColorName } from "../types";

export const COLORS: Record<ColorName, string> = {
	gray: "#6b7280",
	blue: "#3b82f6",
	green: "#22c55e",
	red: "#ef4444",
	yellow: "#eab308",
	purple: "#a855f7",
	orange: "#f97316",
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

// Theme colors for the UI
export const THEME = {
	background: "#1a1b26",
	backgroundAlt: "#24283b",
	foreground: "#c0caf5",
	foregroundDim: "#565f89",
	border: "#3b4261",
	borderHighlight: "#7aa2f7",
	today: "#9ece6a",
	selected: "#7aa2f7",
	error: "#f7768e",
};

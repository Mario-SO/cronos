import type { ColorName } from "@shared/types";

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

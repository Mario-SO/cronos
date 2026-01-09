import { buildHelpKeyMap, joinHelpKeys } from "./help";
import { getCommandContext } from "./context";
import { formatHelpText, getActiveBindings } from "./keymap";
import type { CommandLayerId } from "./types";

export type HelpSection = {
	commandIds: string[];
	label: string;
	order?: string[];
};

export function buildHelpText(
	layerIds: CommandLayerId[],
	sections: HelpSection[],
	options?: { normalizeKey?: (key: string) => string },
): string {
	const ctx = getCommandContext();
	const bindings = getActiveBindings(ctx, { layerIds });
	const keyMap = buildHelpKeyMap(bindings);
	const parts: string[] = [];

	for (const section of sections) {
		const keys = joinHelpKeys(keyMap, section.commandIds, {
			order: section.order,
			normalizeKey: options?.normalizeKey,
		});
		if (!keys) continue;
		parts.push(`${keys} ${section.label}`);
	}

	return parts.join(" | ");
}

export function formatLayerHelpText(layerIds: CommandLayerId[]): string {
	const ctx = getCommandContext();
	const bindings = getActiveBindings(ctx, { layerIds });
	return formatHelpText(bindings);
}

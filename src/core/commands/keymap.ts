import { allCommands, type CommandId, commandById } from "./registry";
import type {
	CommandContext,
	CommandDefinition,
	CommandLayerId,
	KeyBindingInput,
} from "./types";

interface KeyChord {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
}

export interface KeyBinding extends KeyChord {
	commandId: CommandId;
	preventDefault?: boolean;
	display: string;
}

export interface KeymapLayer {
	id: CommandLayerId;
	bindings: KeyBinding[];
	when?: (ctx: CommandContext) => boolean;
}

export interface HelpBinding {
	commandId: CommandId;
	title: string;
	keys: string[];
}

export interface KeyPress {
	name?: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
	preventDefault?: () => void;
}

const KEY_LABELS: Record<string, string> = {
	escape: "Esc",
	return: "Enter",
	tab: "Tab",
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	space: "Space",
	backspace: "Backspace",
	delete: "Del",
};

const layerDefinitions: Array<Omit<KeymapLayer, "bindings">> = [
	{
		id: "modal:search",
		when: (ctx) => ctx.modalType === "search",
	},
	{
		id: "modal:goto",
		when: (ctx) => ctx.modalType === "goto",
	},
	{
		id: "modal:add",
		when: (ctx) => ctx.modalType === "add",
	},
	{
		id: "agenda",
		when: (ctx) => ctx.agendaActive,
	},
	{
		id: "global",
		when: (ctx) => ctx.modalType === "none",
	},
];

export const keymapLayers: KeymapLayer[] = layerDefinitions.map((layer) => ({
	...layer,
	bindings: buildBindingsForLayer(layer.id),
}));

export function getActiveLayers(ctx: CommandContext): KeymapLayer[] {
	return keymapLayers.filter((layer) => (layer.when ? layer.when(ctx) : true));
}

export function resolveKeyBinding(
	keyPress: KeyPress,
	ctx: CommandContext,
): KeyBinding | null {
	const layers = getActiveLayers(ctx);
	for (const layer of layers) {
		for (const binding of layer.bindings) {
			if (!matchesKeyPress(binding, keyPress)) continue;
			const command = commandById.get(binding.commandId);
			if (command?.when && !command.when(ctx)) continue;
			return binding;
		}
	}
	return null;
}

export function getActiveBindings(
	ctx: CommandContext,
	options?: { layerIds?: CommandLayerId[] },
): HelpBinding[] {
	const layers = getActiveLayers(ctx).filter((layer) =>
		options?.layerIds ? options.layerIds.includes(layer.id) : true,
	);
	const bindings: HelpBinding[] = [];
	const seen = new Map<CommandId, HelpBinding>();

	for (const layer of layers) {
		for (const binding of layer.bindings) {
			const command = commandById.get(binding.commandId);
			if (!command) continue;
			if (command.when && !command.when(ctx)) continue;

			const existing = seen.get(binding.commandId);
			if (existing) {
				if (!existing.keys.includes(binding.display)) {
					existing.keys.push(binding.display);
				}
				continue;
			}

			const entry: HelpBinding = {
				commandId: binding.commandId,
				title: command.title,
				keys: [binding.display],
			};
			seen.set(binding.commandId, entry);
			bindings.push(entry);
		}
	}

	return bindings;
}

export function formatHelpText(bindings: HelpBinding[]): string {
	return bindings
		.map((binding) => `${binding.keys.join("/")} ${binding.title}`)
		.join(" | ");
}

function buildBindingsForLayer(layerId: CommandLayerId): KeyBinding[] {
	const bindings: KeyBinding[] = [];
	for (const command of allCommands) {
		const layers = command.layers as CommandDefinition["layers"];
		if (!layers?.includes(layerId)) continue;
		if (!command.keys) continue;

		for (const keyInput of command.keys) {
			const { key, preventDefault } = normalizeKeyInput(keyInput);
			const chord = parseKeyChord(key);
			if (!chord.key) continue;

			const display = formatKeyDisplay(chord);
			bindings.push({
				commandId: command.id as CommandId,
				key: chord.key,
				ctrl: chord.ctrl,
				shift: chord.shift,
				alt: chord.alt,
				meta: chord.meta,
				preventDefault,
				display,
			});
		}
	}
	return bindings;
}

function normalizeKeyInput(keyInput: KeyBindingInput): {
	key: string;
	preventDefault?: boolean;
} {
	if (typeof keyInput === "string") {
		return { key: keyInput };
	}
	return keyInput;
}

function parseKeyChord(input: string): KeyChord {
	const parts = input
		.split("+")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
	const key = parts.pop() ?? "";
	const modifiers = new Set(parts);

	return {
		key: normalizeKeyName(key),
		ctrl: modifiers.has("ctrl") || modifiers.has("control"),
		shift: modifiers.has("shift"),
		alt: modifiers.has("alt") || modifiers.has("option"),
		meta:
			modifiers.has("meta") || modifiers.has("cmd") || modifiers.has("command"),
	};
}

function matchesKeyPress(binding: KeyBinding, keyPress: KeyPress): boolean {
	if (!keyPress.name) return false;

	const keyName = normalizeKeyName(keyPress.name);
	if (keyName !== binding.key) return false;
	if (Boolean(binding.ctrl) !== Boolean(keyPress.ctrl)) return false;
	if (Boolean(binding.shift) !== Boolean(keyPress.shift)) return false;
	if (Boolean(binding.alt) !== Boolean(keyPress.alt)) return false;
	if (Boolean(binding.meta) !== Boolean(keyPress.meta)) return false;

	return true;
}

function formatKeyDisplay(chord: KeyChord): string {
	const parts: string[] = [];
	if (chord.ctrl) parts.push("Ctrl");
	if (chord.alt) parts.push("Alt");
	if (chord.shift) parts.push("Shift");
	if (chord.meta) parts.push("Meta");

	const keyLabel =
		KEY_LABELS[chord.key] ??
		(chord.key.length === 1 ? chord.key.toUpperCase() : chord.key);
	parts.push(keyLabel);
	return parts.join("+");
}

function normalizeKeyName(key: string): string {
	return key.toLowerCase();
}

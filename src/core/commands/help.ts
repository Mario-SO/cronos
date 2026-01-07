export interface HelpBindingLike {
	commandId: string;
	keys: string[];
}

export interface HelpKeyMapOptions {
	order?: string[];
	normalizeKey?: (key: string) => string;
}

export type HelpKeyMap = Map<string, string[]>;

export function buildHelpKeyMap(bindings: HelpBindingLike[]): HelpKeyMap {
	return new Map(bindings.map((binding) => [binding.commandId, binding.keys]));
}

export function joinHelpKeys(
	keyMap: HelpKeyMap,
	commandIds: string[],
	options?: HelpKeyMapOptions,
): string {
	const keys = commandIds.flatMap((commandId) => keyMap.get(commandId) ?? []);
	const normalized = options?.normalizeKey
		? keys.map(options.normalizeKey)
		: keys;
	const unique = Array.from(new Set(normalized));

	if (options?.order) {
		const orderMap = new Map(
			options.order.map((value, index) => [value, index]),
		);
		unique.sort((a, b) => {
			const aIndex = orderMap.get(a) ?? Number.POSITIVE_INFINITY;
			const bIndex = orderMap.get(b) ?? Number.POSITIVE_INFINITY;
			return aIndex - bIndex;
		});
	}

	return unique.join("/");
}

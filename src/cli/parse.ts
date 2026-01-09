import { isValidDate } from "@shared/dateUtils";

export type FlagValue = string | boolean;

export interface ParsedArgs {
	command?: string;
	flags: Record<string, FlagValue>;
	positionals: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
	const flags: Record<string, FlagValue> = {};
	const positionals: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg) continue;

		if (arg.startsWith("--")) {
			const [rawKey, inlineValue] = arg.slice(2).split("=");
			if (!rawKey) continue;
			if (inlineValue !== undefined) {
				flags[rawKey] = inlineValue;
				continue;
			}
			const next = argv[index + 1];
			if (next && !next.startsWith("-")) {
				flags[rawKey] = next;
				index += 1;
			} else {
				flags[rawKey] = true;
			}
			continue;
		}

		if (arg === "-h") {
			flags.help = true;
			continue;
		}

		if (arg === "-d") {
			const next = argv[index + 1];
			if (next && !next.startsWith("-")) {
				flags.date = next;
				index += 1;
			}
			continue;
		}

		positionals.push(arg);
	}

	const command = positionals.shift();
	return { command, flags, positionals };
}

export function parseDateValue(value: string | undefined): string | null {
	if (!value) return null;
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (!isValidDate(year, month - 1, day)) return null;
	return `${match[1]}-${match[2]}-${match[3]}`;
}

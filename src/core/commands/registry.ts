import { agendaCommands } from "./agenda";
import { appCommands } from "./app";
import { calendarCommands } from "./calendar";
import { modalCommands } from "./modal";
import type { CommandDefinition } from "./types";

export const allCommands = [
	...agendaCommands,
	...calendarCommands,
	...modalCommands,
	...appCommands,
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof allCommands)[number]["id"];

export const commandById = new Map<CommandId, CommandDefinition>(
	allCommands.map((command) => [command.id, command]),
);

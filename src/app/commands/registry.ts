import { appCommands } from "./appCommands";
import { modalCommands } from "./modalCommands";
import { agendaCommands } from "@features/agenda/agendaCommands";
import { calendarCommands } from "@features/calendar/calendarCommands";
import { eventCommands } from "@features/events/eventCommands";
import { settingsCommands } from "@features/settings/settingsCommands";
import type { CommandDefinition } from "./types";

export const allCommands = [
	...agendaCommands,
	...calendarCommands,
	...eventCommands,
	...settingsCommands,
	...modalCommands,
	...appCommands,
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof allCommands)[number]["id"];

export const commandById = new Map<CommandId, CommandDefinition>(
	allCommands.map((command) => [command.id, command]),
);

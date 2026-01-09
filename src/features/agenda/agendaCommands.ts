import { Effect } from "effect";
import type { CommandDefinition } from "@app/commands/types";

export const agendaCommands = [
	{
		id: "agenda.moveDown",
		title: "Next event",
		keys: [{ key: "down", preventDefault: true }],
		layers: ["agenda"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.agenda?.moveSelection(1);
			}),
	},
	{
		id: "agenda.moveUp",
		title: "Previous event",
		keys: [{ key: "up", preventDefault: true }],
		layers: ["agenda"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.agenda?.moveSelection(-1);
			}),
	},
	{
		id: "agenda.edit",
		title: "Edit",
		keys: ["e"],
		layers: ["agenda"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.agenda?.editSelection();
			}),
	},
	{
		id: "agenda.delete",
		title: "Delete",
		keys: ["d"],
		layers: ["agenda"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.agenda?.deleteSelection();
			}),
	},
] as const satisfies readonly CommandDefinition[];

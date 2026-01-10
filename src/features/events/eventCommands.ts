import type { CommandDefinition } from "@app/commands/types";
import { openModal } from "@features/overlays/modalState";
import { Effect } from "effect";

export const eventCommands = [
	{
		id: "modal.openAdd",
		title: "Add event",
		keys: ["a"],
		layers: ["global"],
		run: () => openModal("add"),
	},
	{
		id: "modal.openSearch",
		title: "Search events",
		keys: ["s"],
		layers: ["global"],
		run: () => openModal("search"),
	},
	{
		id: "modal.add.submit",
		title: "Save",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:add"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.addModal?.submit();
			}),
	},
	{
		id: "modal.add.nextField",
		title: "Next field",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["modal:add"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.addModal?.focusNextField();
			}),
	},
	{
		id: "modal.add.prevField",
		title: "Previous field",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["modal:add"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.addModal?.focusPrevField();
			}),
	},
	{
		id: "modal.search.moveDown",
		title: "Next result",
		keys: [{ key: "down", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.searchModal?.moveSelection(1);
			}),
	},
	{
		id: "modal.search.moveUp",
		title: "Previous result",
		keys: [{ key: "up", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.searchModal?.moveSelection(-1);
			}),
	},
	{
		id: "modal.search.goTo",
		title: "Go to date",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.searchModal?.goToSelection();
			}),
	},
	{
		id: "modal.search.edit",
		title: "Edit",
		keys: ["ctrl+e"],
		layers: ["modal:search"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.searchModal?.editSelection();
			}),
	},
	{
		id: "modal.search.delete",
		title: "Delete",
		keys: ["ctrl+d"],
		layers: ["modal:search"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.searchModal?.deleteSelection();
			}),
	},
] as const satisfies readonly CommandDefinition[];

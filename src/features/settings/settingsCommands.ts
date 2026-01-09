import { Effect } from "effect";
import { openModal } from "@features/overlays/modalState";
import type { CommandDefinition } from "@app/commands/types";

export const settingsCommands = [
	{
		id: "modal.openSettings",
		title: "Settings",
		keys: [","],
		layers: ["global"],
		run: () => openModal("settings"),
	},
	{
		id: "modal.settings.sectionNext",
		title: "Next section",
		keys: [{ key: "l", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.nextSection();
			}),
	},
	{
		id: "modal.settings.sectionPrev",
		title: "Previous section",
		keys: [{ key: "h", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.prevSection();
			}),
	},
	{
		id: "modal.settings.optionNext",
		title: "Next option",
		keys: [{ key: "j", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.nextOption();
			}),
	},
	{
		id: "modal.settings.optionPrev",
		title: "Previous option",
		keys: [{ key: "k", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.prevOption();
			}),
	},
	{
		id: "modal.settings.focusNext",
		title: "Next section",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.focusNextArea();
			}),
	},
	{
		id: "modal.settings.focusPrev",
		title: "Previous section",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.focusPrevArea();
			}),
	},
	{
		id: "modal.settings.activate",
		title: "Activate",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:settings"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.settingsModal?.activate();
			}),
	},
] as const satisfies readonly CommandDefinition[];

import { closeModal, openModal } from "@state/modal";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

export const modalCommands = [
	{
		id: "modal.openAdd",
		title: "Add event",
		keys: ["a"],
		layers: ["global"],
		run: () => openModal("add"),
	},
	{
		id: "modal.openGoto",
		title: "Go to date",
		keys: ["g"],
		layers: ["global"],
		run: () => openModal("goto"),
	},
	{
		id: "modal.openSearch",
		title: "Search events",
		keys: ["s"],
		layers: ["global"],
		run: () => openModal("search"),
	},
	{
		id: "modal.openSettings",
		title: "Settings",
		keys: [","],
		layers: ["global"],
		run: () => openModal("settings"),
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
		id: "modal.goto.nextField",
		title: "Next field",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.focusNextField();
			}),
	},
	{
		id: "modal.goto.prevField",
		title: "Previous field",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.focusPrevField();
			}),
	},
	{
		id: "modal.goto.submit",
		title: "Go to date",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.gotoModal?.submit();
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
	{
		id: "modal.close",
		title: "Close",
		keys: ["escape"],
		layers: ["modal:add", "modal:goto", "modal:search", "modal:settings"],
		when: (ctx) => ctx.modalType !== "none",
		run: () => closeModal,
	},
] as const satisfies readonly CommandDefinition[];

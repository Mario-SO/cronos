import { closeModal, openModal } from "@state/modal";
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
		id: "modal.add.submit",
		title: "Save",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:add"],
		run: (ctx) => {
			ctx.addModal?.submit();
		},
	},
	{
		id: "modal.goto.nextField",
		title: "Next field",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) => {
			ctx.gotoModal?.focusNextField();
		},
	},
	{
		id: "modal.goto.prevField",
		title: "Previous field",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) => {
			ctx.gotoModal?.focusPrevField();
		},
	},
	{
		id: "modal.goto.submit",
		title: "Go to date",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:goto"],
		run: (ctx) => {
			ctx.gotoModal?.submit();
		},
	},
	{
		id: "modal.search.moveDown",
		title: "Next result",
		keys: [{ key: "down", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) => {
			ctx.searchModal?.moveSelection(1);
		},
	},
	{
		id: "modal.search.moveUp",
		title: "Previous result",
		keys: [{ key: "up", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) => {
			ctx.searchModal?.moveSelection(-1);
		},
	},
	{
		id: "modal.search.goTo",
		title: "Go to date",
		keys: [{ key: "return", preventDefault: true }],
		layers: ["modal:search"],
		run: (ctx) => {
			ctx.searchModal?.goToSelection();
		},
	},
	{
		id: "modal.search.edit",
		title: "Edit",
		keys: ["ctrl+e"],
		layers: ["modal:search"],
		run: (ctx) => {
			ctx.searchModal?.editSelection();
		},
	},
	{
		id: "modal.search.delete",
		title: "Delete",
		keys: ["ctrl+d"],
		layers: ["modal:search"],
		run: (ctx) => {
			ctx.searchModal?.deleteSelection();
		},
	},
	{
		id: "modal.close",
		title: "Close",
		keys: ["escape"],
		layers: ["modal:add", "modal:goto", "modal:search"],
		when: (ctx) => ctx.modalType !== "none",
		run: () => closeModal,
	},
] as const satisfies readonly CommandDefinition[];

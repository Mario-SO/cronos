import { closeModal } from "@features/overlays/modalState";
import type { CommandDefinition } from "./types";

export const modalCommands = [
	{
		id: "modal.close",
		title: "Close",
		keys: ["escape"],
		layers: ["modal:add", "modal:goto", "modal:search", "modal:settings"],
		when: (ctx) => ctx.modalType !== "none",
		run: () => closeModal,
	},
] as const satisfies readonly CommandDefinition[];

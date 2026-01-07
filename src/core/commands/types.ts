import type { ModalType } from "@core/types";
import type { Effect } from "effect";

export interface AgendaCommandHandlers {
	moveSelection: (delta: number) => void;
	editSelection: () => void;
	deleteSelection: () => void;
}

export interface AddModalCommandHandlers {
	submit: () => void;
}

export interface GoToDateCommandHandlers {
	focusNextField: () => void;
	focusPrevField: () => void;
	submit: () => void;
}

export interface SearchModalCommandHandlers {
	moveSelection: (delta: number) => void;
	goToSelection: () => void;
	editSelection: () => void;
	deleteSelection: () => void;
}

export interface CommandContext {
	modalType: ModalType;
	agendaOpen: boolean;
	agendaActive: boolean;
	agenda?: AgendaCommandHandlers | null;
	addModal?: AddModalCommandHandlers | null;
	gotoModal?: GoToDateCommandHandlers | null;
	searchModal?: SearchModalCommandHandlers | null;
}

export interface KeyBindingConfig {
	key: string;
	preventDefault?: boolean;
}

export type KeyBindingInput = string | KeyBindingConfig;

export type CommandLayerId =
	| "global"
	| "agenda"
	| "modal:add"
	| "modal:goto"
	| "modal:search";

export interface CommandDefinition {
	id: string;
	title: string;
	keys?: KeyBindingInput[];
	layers?: readonly CommandLayerId[];
	when?: (ctx: CommandContext) => boolean;
	run: (ctx: CommandContext) => Effect.Effect<unknown, unknown, never> | void;
}

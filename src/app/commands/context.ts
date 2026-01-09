import { getAgendaState } from "@features/agenda/agendaState";
import { getModalState } from "@features/overlays/modalState";
import type {
	AddModalCommandHandlers,
	AgendaCommandHandlers,
	CommandContext,
	GoToDateCommandHandlers,
	SearchModalCommandHandlers,
	SettingsModalCommandHandlers,
} from "./types";

let agendaHandlers: AgendaCommandHandlers | null = null;
let addModalHandlers: AddModalCommandHandlers | null = null;
let gotoModalHandlers: GoToDateCommandHandlers | null = null;
let searchModalHandlers: SearchModalCommandHandlers | null = null;
let settingsModalHandlers: SettingsModalCommandHandlers | null = null;

export function setAgendaCommandHandlers(
	handlers: AgendaCommandHandlers | null,
): void {
	agendaHandlers = handlers;
}

export function setAddModalCommandHandlers(
	handlers: AddModalCommandHandlers | null,
): void {
	addModalHandlers = handlers;
}

export function setGoToDateCommandHandlers(
	handlers: GoToDateCommandHandlers | null,
): void {
	gotoModalHandlers = handlers;
}

export function setSearchModalCommandHandlers(
	handlers: SearchModalCommandHandlers | null,
): void {
	searchModalHandlers = handlers;
}

export function setSettingsModalCommandHandlers(
	handlers: SettingsModalCommandHandlers | null,
): void {
	settingsModalHandlers = handlers;
}

export function getCommandContext(): CommandContext {
	const modalState = getModalState();
	const agendaState = getAgendaState();
	const agendaActive = modalState.type === "none" && agendaState.isOpen;

	return {
		modalType: modalState.type,
		agendaOpen: agendaState.isOpen,
		agendaActive,
		agenda: agendaHandlers,
		addModal: addModalHandlers,
		gotoModal: gotoModalHandlers,
		searchModal: searchModalHandlers,
		settingsModal: settingsModalHandlers,
	};
}

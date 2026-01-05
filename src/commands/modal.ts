import { Effect } from "effect";
import { closeModal, openModal } from "../state/modal";

export function openAdd() {
	Effect.runSync(openModal("add"));
}

export function openView() {
	Effect.runSync(openModal("view"));
}

export function openGoto() {
	Effect.runSync(openModal("goto"));
}

export function close() {
	Effect.runSync(closeModal);
}

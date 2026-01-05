import { closeModal, openModal } from "@state/modal";
import { Effect } from "effect";

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

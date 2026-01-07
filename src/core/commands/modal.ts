import { closeModal, openModal } from "@state/modal";
import { Effect } from "effect";

export function openAdd() {
	Effect.runSync(openModal("add"));
}

export function openGoto() {
	Effect.runSync(openModal("goto"));
}

export function openSearch() {
	Effect.runSync(openModal("search"));
}

export function close() {
	Effect.runSync(closeModal);
}

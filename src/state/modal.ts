import type { CalendarEvent, ModalState, ModalType } from "@core/types";
import { Effect, Ref } from "effect";

const initialModalState: ModalState = {
	type: "none",
	editingEvent: undefined,
};

// Create ref for modal state
export const modalStateRef = Effect.runSync(Ref.make(initialModalState));

// Modal effects
export const openModal = (type: ModalType) =>
	Effect.gen(function* () {
		yield* Ref.set(modalStateRef, { type, editingEvent: undefined });
	});

export const openEditModal = (event: CalendarEvent) =>
	Effect.gen(function* () {
		yield* Ref.set(modalStateRef, { type: "add", editingEvent: event });
	});

export const closeModal = Effect.gen(function* () {
	yield* Ref.set(modalStateRef, { type: "none", editingEvent: undefined });
});

// Hook for React components
export function useModalState(): ModalState {
	return Effect.runSync(Ref.get(modalStateRef));
}

// Get current modal type synchronously
export function getModalType(): ModalType {
	return Effect.runSync(Ref.get(modalStateRef)).type;
}

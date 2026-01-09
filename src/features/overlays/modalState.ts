import type { CalendarEvent, ModalState, ModalType } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";

const initialModalState: ModalState = {
	type: "none",
	editingEvent: undefined,
};

// Create ref for modal state
export const modalStateRef = createSubscriptionRef(initialModalState);

// Modal effects
export const openModal = (type: ModalType) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(modalStateRef, {
			type,
			editingEvent: undefined,
		});
	});

export const openEditModal = (event: CalendarEvent) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(modalStateRef, {
			type: "add",
			editingEvent: event,
		});
	});

export const closeModal = Effect.gen(function* () {
	yield* SubscriptionRef.set(modalStateRef, {
		type: "none",
		editingEvent: undefined,
	});
});

// Hook for React components
export function useModalState(): ModalState {
	return useSubscriptionValue(modalStateRef);
}

// Get current modal type synchronously
export function getModalType(): ModalType {
	return getSubscriptionValue(modalStateRef).type;
}

export function getModalState(): ModalState {
	return getSubscriptionValue(modalStateRef);
}

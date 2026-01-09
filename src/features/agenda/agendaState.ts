import { Effect, SubscriptionRef } from "effect";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";

interface AgendaState {
	isOpen: boolean;
}

const initialAgendaState: AgendaState = {
	isOpen: false,
};

export const agendaStateRef = createSubscriptionRef(initialAgendaState);

export const openAgenda = Effect.gen(function* () {
	yield* SubscriptionRef.set(agendaStateRef, { isOpen: true });
});

export const closeAgenda = Effect.gen(function* () {
	yield* SubscriptionRef.set(agendaStateRef, { isOpen: false });
});

export const toggleAgenda = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(agendaStateRef);
	yield* SubscriptionRef.set(agendaStateRef, { isOpen: !state.isOpen });
});

export function useAgendaState(): AgendaState {
	return useSubscriptionValue(agendaStateRef);
}

export function getAgendaState(): AgendaState {
	return getSubscriptionValue(agendaStateRef);
}

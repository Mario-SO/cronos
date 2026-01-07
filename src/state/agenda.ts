import { Effect, Ref } from "effect";

interface AgendaState {
	isOpen: boolean;
}

const initialAgendaState: AgendaState = {
	isOpen: false,
};

export const agendaStateRef = Effect.runSync(Ref.make(initialAgendaState));

export const openAgenda = Effect.gen(function* () {
	yield* Ref.set(agendaStateRef, { isOpen: true });
});

export const closeAgenda = Effect.gen(function* () {
	yield* Ref.set(agendaStateRef, { isOpen: false });
});

export const toggleAgenda = Effect.gen(function* () {
	const state = yield* Ref.get(agendaStateRef);
	yield* Ref.set(agendaStateRef, { isOpen: !state.isOpen });
});

export function useAgendaState(): AgendaState {
	return Effect.runSync(Ref.get(agendaStateRef));
}

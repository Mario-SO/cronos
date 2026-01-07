import { Effect, Fiber, Stream, SubscriptionRef } from "effect";
import { useCallback, useSyncExternalStore } from "react";

export function createSubscriptionRef<A>(
	initial: A,
): SubscriptionRef.SubscriptionRef<A> {
	return Effect.runSync(SubscriptionRef.make(initial));
}

export function getSubscriptionValue<A>(
	ref: SubscriptionRef.SubscriptionRef<A>,
): A {
	return Effect.runSync(SubscriptionRef.get(ref));
}

export function useSubscriptionValue<A>(
	ref: SubscriptionRef.SubscriptionRef<A>,
): A {
	const getSnapshot = useCallback(
		() => Effect.runSync(SubscriptionRef.get(ref)),
		[ref],
	);
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const fiber = Effect.runFork(
				Effect.scoped(
					Stream.runForEach(ref.changes, () => Effect.sync(onStoreChange)),
				),
			);
			return () => {
				Effect.runFork(Fiber.interrupt(fiber));
			};
		},
		[ref],
	);

	return useSyncExternalStore(subscribe, getSnapshot);
}

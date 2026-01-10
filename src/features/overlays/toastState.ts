import { createSubscriptionRef, useSubscriptionValue } from "@shared/store";
import { Effect, SubscriptionRef } from "effect";

export type ToastTone = "error" | "info";

export interface Toast {
	id: string;
	message: string;
	tone: ToastTone;
}

const DEFAULT_DURATION_MS = 4000;

const toastStateRef = createSubscriptionRef<Toast[]>([]);

export function useToasts(): Toast[] {
	return useSubscriptionValue(toastStateRef);
}

function createToastId(): string {
	return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const pushToast = (
	message: string,
	options?: { tone?: ToastTone; durationMs?: number },
) =>
	Effect.gen(function* () {
		const id = createToastId();
		const tone = options?.tone ?? "info";
		const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
		yield* SubscriptionRef.update(toastStateRef, (toasts) => [
			...toasts,
			{ id, message, tone },
		]);
		yield* Effect.sleep(durationMs);
		yield* SubscriptionRef.update(toastStateRef, (toasts) =>
			toasts.filter((toast) => toast.id !== id),
		);
	});

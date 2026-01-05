import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { execute } from "../commands";
import type { Scope } from "../types";
import { findShortcut } from "./registry";

interface UseShortcutHandlerOptions {
	/** Current scope (determines which shortcuts are active) */
	scope: Scope;
	/** Callback after any command executes (for triggering re-renders) */
	onCommandExecuted?: () => void;
}

/**
 * Hook that handles keyboard shortcuts based on the current scope.
 *
 * Usage:
 * ```
 * useShortcutHandler({
 *   scope: modalType === "none" ? "root" : modalType,
 *   onCommandExecuted: triggerUpdate,
 * })
 * ```
 */
export function useShortcutHandler({
	scope,
	onCommandExecuted,
}: UseShortcutHandlerOptions): void {
	const handleKey = useCallback(
		(key: { name?: string }) => {
			if (!key.name) return;

			const shortcut = findShortcut(key.name, scope);
			if (shortcut) {
				execute(shortcut.command);
				onCommandExecuted?.();
			}
		},
		[scope, onCommandExecuted],
	);

	useKeyboard(handleKey);
}

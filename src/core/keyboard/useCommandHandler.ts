import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import {
	executeCommand,
	getCommandContext,
	resolveKeyBinding,
} from "../commands";

interface UseCommandHandlerOptions {
	/** Callback after any command executes (for triggering re-renders) */
	onCommandExecuted?: () => void;
}

export function useCommandHandler({
	onCommandExecuted,
}: UseCommandHandlerOptions): void {
	const handleKey = useCallback(
		(key: { name?: string; preventDefault?: () => void }) => {
			if (!key.name) return;

			const ctx = getCommandContext();
			const binding = resolveKeyBinding(key, ctx);
			if (!binding) return;

			if (binding.preventDefault) {
				key.preventDefault?.();
			}

			executeCommand(binding.commandId, ctx);
			onCommandExecuted?.();
		},
		[onCommandExecuted],
	);

	useKeyboard(handleKey);
}

import { Effect } from "effect";
import { type CommandId, commandById } from "./registry";
import type { CommandContext } from "./types";

export function executeCommand(
	commandId: CommandId,
	ctx: CommandContext,
): void {
	const command = commandById.get(commandId);
	if (!command) return;
	if (command.when && !command.when(ctx)) return;

	try {
		const result = command.run(ctx);
		if (Effect.isEffect(result)) {
			const effect = Effect.catchAll(
				result as Effect.Effect<unknown, unknown, never>,
				(error) =>
					Effect.sync(() => {
						console.error(`Command failed: ${commandId}`, error);
					}),
			);
			Effect.runSync(effect);
		}
	} catch (error) {
		console.error(`Command failed: ${commandId}`, error);
	}
}

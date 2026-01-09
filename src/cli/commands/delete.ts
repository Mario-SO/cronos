import { Effect } from "effect";
import { deleteEvent } from "@features/events/eventsState";

interface DeleteOptions {
	id?: string;
}

export function runDelete(options: DeleteOptions): void {
	if (!options.id) {
		console.error("Missing --id.");
		process.exitCode = 1;
		return;
	}

	const deleted = Effect.runSync(deleteEvent(options.id));
	if (!deleted) {
		console.error("Event not found.");
		process.exitCode = 1;
		return;
	}

	console.log(`Deleted ${options.id}.`);
}

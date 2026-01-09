import { Effect } from "effect";
import { addEvent } from "@features/events/eventsState";
import { parseEventInput } from "@features/events/eventParser";
import { parseDateValue } from "../parse";
import { formatEventLine } from "../format";

interface AddOptions {
	date?: string;
}

export function runAdd(options: AddOptions, input: string): void {
	const date = parseDateValue(options.date);
	if (!date) {
		console.error("Missing or invalid --date. Use YYYY-MM-DD.");
		process.exitCode = 1;
		return;
	}

	const parsed = parseEventInput(input);
	if (!parsed.title) {
		console.error("Missing event title.");
		process.exitCode = 1;
		return;
	}

	const created = Effect.runSync(
		addEvent(
			date,
			parsed.title,
			parsed.startTime,
			parsed.endTime,
			parsed.color,
		),
	);

	if (!created) {
		console.error("Event could not be created.");
		process.exitCode = 1;
		return;
	}

	console.log(formatEventLine(created));
}

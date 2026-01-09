#!/usr/bin/env bun
import { closeDatabase, initDatabase } from "@data/db";
import { initEventStore } from "@features/events/eventsState";
import { Effect } from "effect";
import { runAdd } from "./commands/add";
import { runDelete } from "./commands/delete";
import { runList } from "./commands/list";
import { runNext } from "./commands/next";
import { printHelp } from "./help";
import { parseArgs } from "./parse";

async function run(): Promise<void> {
	const { command, flags, positionals } = parseArgs(process.argv.slice(2));

	if (!command || command === "tui") {
		await import("@app/index");
		return;
	}

	if (flags.help || command === "help") {
		printHelp();
		return;
	}

	initDatabase();
	Effect.runSync(initEventStore);

	try {
		switch (command) {
			case "list": {
				runList({
					date: typeof flags.date === "string" ? flags.date : undefined,
					from: typeof flags.from === "string" ? flags.from : undefined,
					to: typeof flags.to === "string" ? flags.to : undefined,
				});
				break;
			}
			case "add": {
				runAdd(
					{ date: typeof flags.date === "string" ? flags.date : undefined },
					positionals.join(" "),
				);
				break;
			}
			case "delete": {
				runDelete({
					id: typeof flags.id === "string" ? flags.id : undefined,
				});
				break;
			}
			case "next": {
				runNext();
				break;
			}
			default:
				console.error(`Unknown command: ${command}`);
				printHelp();
				process.exitCode = 1;
		}
	} finally {
		closeDatabase();
	}
}

await run();

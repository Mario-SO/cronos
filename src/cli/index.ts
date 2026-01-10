#!/usr/bin/env bun
import { closeDatabase, initDatabase } from "@data/db";
import { initEventStore } from "@features/events/eventsState";
import { syncGoogleNow } from "@features/google/googleSync";
import { Effect } from "effect";
import { runAdd } from "./commands/add";
import { runDelete } from "./commands/delete";
import { runList } from "./commands/list";
import { runNext } from "./commands/next";
import { printHelp } from "./help";
import { parseArgs } from "./parse";

type SpinnerState = "success" | "error" | "info";

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function startSpinner(label: string) {
	if (!process.stdout.isTTY) {
		console.log(label);
		return (state: SpinnerState, message: string) => {
			const prefix = state === "success" ? "✓" : state === "error" ? "✗" : "•";
			console.log(`${prefix} ${message}`);
		};
	}

	let frameIndex = 0;
	const render = () => {
		const frame = spinnerFrames[frameIndex] ?? spinnerFrames[0];
		process.stdout.write(`\r\x1b[2K${frame} ${label}`);
		frameIndex = (frameIndex + 1) % spinnerFrames.length;
	};
	const interval = setInterval(render, 80);
	render();
	return (state: SpinnerState, message: string) => {
		clearInterval(interval);
		const prefix = state === "success" ? "✓" : state === "error" ? "✗" : "•";
		process.stdout.write(`\r\x1b[2K${prefix} ${message}\n`);
	};
}

async function run(): Promise<void> {
	const { command, flags, positionals } = parseArgs(process.argv.slice(2));

	if (flags.help || command === "help") {
		printHelp();
		return;
	}

	const isTui = !command || command === "tui";
	const needsDatabase = !isTui;

	if (needsDatabase) {
		initDatabase();
		Effect.runSync(initEventStore);
	}

	if (isTui) {
		await import("@app/index");
		return;
	}

	try {
		switch (command) {
			case "sync": {
				const stopSpinner = startSpinner("Syncing Google calendars");
				const result = await Effect.runPromise(
					Effect.either(syncGoogleNow({ forceRefresh: true })),
				);
				if (result._tag === "Left") {
					const error = result.left;
					const message =
						error instanceof Error ? error.message : "Sync failed";
					stopSpinner("error", `Sync failed: ${message}`);
					process.exitCode = 1;
					break;
				}
				stopSpinner("success", "Sync complete");
				break;
			}
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

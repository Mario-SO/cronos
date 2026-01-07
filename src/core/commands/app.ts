import { closeDatabase } from "@db/index";
import { Effect } from "effect";
import { renderer, root } from "../renderer";
import type { CommandDefinition } from "./types";

export const appCommands = [
	{
		id: "app.quit",
		title: "Quit",
		keys: ["q"],
		layers: ["global"],
		run: () =>
			Effect.sync(() => {
				root?.unmount();
				renderer.stop?.();
				renderer.destroy?.();
				closeDatabase();
				process.exit(0);
			}),
	},
] as const satisfies readonly CommandDefinition[];

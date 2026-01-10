import { spawn } from "node:child_process";
import { Effect } from "effect";

export const openBrowser = (url: string) =>
	Effect.try(() => {
		const platform = process.platform;
		if (platform === "darwin") {
			spawn("open", [url], { stdio: "ignore", detached: true }).unref();
			return;
		}
		if (platform === "win32") {
			spawn("cmd", ["/c", "start", "", url], {
				stdio: "ignore",
				detached: true,
			}).unref();
			return;
		}
		spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
	});

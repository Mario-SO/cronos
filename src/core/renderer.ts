import { createCliRenderer } from "@opentui/core";
import type { createRoot } from "@opentui/react";

export const renderer = await createCliRenderer({
	exitOnCtrlC: true,
});

// Will be set after createRoot is called
export let root: ReturnType<typeof createRoot> | null = null;

export function setRoot(r: ReturnType<typeof createRoot>) {
	root = r;
}

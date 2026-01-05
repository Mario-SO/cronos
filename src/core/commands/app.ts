import { closeDatabase } from "@db/index";
import { renderer, root } from "../renderer";

export async function quit() {
	root?.unmount();
	renderer.stop?.();
	renderer.destroy?.();
	closeDatabase();
	process.exit(0);
}

import { renderer, root } from "../renderer";

export async function quit() {
	root?.unmount();
	renderer.stop?.();
	renderer.destroy?.();
	process.exit(0);
}

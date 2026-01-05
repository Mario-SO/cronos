import { renderer, setRoot } from "@core/renderer";
import { createRoot } from "@opentui/react";
import { App } from "./App";

const root = createRoot(renderer);
setRoot(root);

root.render(<App />);

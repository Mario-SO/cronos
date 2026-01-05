import { createRoot } from "@opentui/react";
import { App } from "./App";
import { renderer, setRoot } from "./renderer";

const root = createRoot(renderer);
setRoot(root);

root.render(<App />);

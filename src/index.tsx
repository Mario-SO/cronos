import { renderer, setRoot } from "@core/renderer";
import { initDatabase } from "@db/index";
import { createRoot } from "@opentui/react";
import { initEventStore } from "@state/events";
import { initGoogleState } from "@state/google";
import { Effect } from "effect";
import { App } from "./App";

// Initialize database and load events
initDatabase();
Effect.runSync(initEventStore);
Effect.runSync(initGoogleState);

const root = createRoot(renderer);
setRoot(root);

root.render(<App />);

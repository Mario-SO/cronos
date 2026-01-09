import { renderer, setRoot } from "@app/renderer";
import { initDatabase } from "@data/db";
import { initEventStore } from "@features/events/eventsState";
import { initGoogleState } from "@features/google/googleState";
import { createRoot } from "@opentui/react";
import { Effect } from "effect";
import { App } from "./App";

// Initialize database and load events
initDatabase();
Effect.runSync(initEventStore);
Effect.runSync(initGoogleState);

const root = createRoot(renderer);
setRoot(root);

root.render(<App />);

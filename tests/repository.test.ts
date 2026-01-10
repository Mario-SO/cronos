import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { closeDatabase, getDatabase, initDatabase } from "@data/db";
import {
	deleteEventById,
	findAllEvents,
	findEventsByDate,
	getMaxEventIdCounter,
	insertEvent,
	updateEventById,
} from "@data/repository";
import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";

const TEST_DB_DIR = join(import.meta.dir, "..", "tmp");
const TEST_DB_PATH = join(TEST_DB_DIR, "test-events.db");

// Set the environment variable before any database operations
process.env.CRONOS_DB_PATH = TEST_DB_PATH;

/**
 * Helper to create a test event with default values
 */
function createTestEvent(
	overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
	return {
		id: `event-1-${Date.now()}`,
		date: "2025-01-05",
		title: "Test Event",
		color: "blue",
		...overrides,
	};
}

/**
 * Clear all events from the database between tests
 */
function clearDatabase(): void {
	const db = getDatabase();
	db.run("DELETE FROM events");
}

/**
 * Helper to get an array element with runtime assertion for tests
 */
function at<T>(arr: T[], index: number): T {
	const item = arr[index];
	if (item === undefined) {
		throw new Error(
			`Expected element at index ${index} but array has ${arr.length} elements`,
		);
	}
	return item;
}

describe("Repository CRUD Operations", () => {
	beforeAll(() => {
		// Initialize the test database
		initDatabase();
	});

	afterAll(() => {
		// Close database and clean up test files
		closeDatabase();
		try {
			rmSync(TEST_DB_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	beforeEach(() => {
		// Clear database before each test for isolation
		clearDatabase();
	});

	describe("insertEvent", () => {
		test("inserts a simple event successfully", () => {
			const event = createTestEvent({
				id: "event-1-1234567890",
				title: "Team Meeting",
				date: "2025-01-05",
				color: "blue",
			});

			Effect.runSync(insertEvent(event));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				id: "event-1-1234567890",
				title: "Team Meeting",
				date: "2025-01-05",
				color: "blue",
			});
		});

		test("inserts an event with time range", () => {
			const event = createTestEvent({
				id: "event-2-1234567890",
				title: "Workshop",
				startTime: 540, // 9am
				endTime: 660, // 11am
			});

			Effect.runSync(insertEvent(event));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(at(events, 0).startTime).toBe(540);
			expect(at(events, 0).endTime).toBe(660);
		});

		test("inserts an event with only start time", () => {
			const event = createTestEvent({
				id: "event-3-1234567890",
				title: "Quick Call",
				startTime: 840, // 2pm
			});

			Effect.runSync(insertEvent(event));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(at(events, 0).startTime).toBe(840);
			expect(at(events, 0).endTime).toBeUndefined();
		});

		test("inserts an event with a conference link", () => {
			const event = createTestEvent({
				id: "event-4-1234567890",
				title: "Meet Sync",
				conferenceUrl: "https://meet.google.com/abc-defg-hij",
			});

			Effect.runSync(insertEvent(event));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(at(events, 0).conferenceUrl).toBe(
				"https://meet.google.com/abc-defg-hij",
			);
		});

		test("inserts multiple events", () => {
			const event1 = createTestEvent({ id: "event-1-111", title: "First" });
			const event2 = createTestEvent({ id: "event-2-222", title: "Second" });
			const event3 = createTestEvent({ id: "event-3-333", title: "Third" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));
			Effect.runSync(insertEvent(event3));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(3);
		});

		test("inserts events with all color options", () => {
			const colors = [
				"gray",
				"blue",
				"green",
				"red",
				"yellow",
				"purple",
				"orange",
			] as const;

			for (let i = 0; i < colors.length; i++) {
				const event = createTestEvent({
					id: `event-${i}-color`,
					title: `${colors[i]} event`,
					color: colors[i],
				});
				Effect.runSync(insertEvent(event));
			}

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(7);

			for (const color of colors) {
				expect(events.some((e) => e.color === color)).toBe(true);
			}
		});
	});

	describe("findEventsByDate", () => {
		test("returns events for a specific date", () => {
			const event1 = createTestEvent({
				id: "e1",
				date: "2025-01-05",
				title: "Jan 5 Event",
			});
			const event2 = createTestEvent({
				id: "e2",
				date: "2025-01-05",
				title: "Another Jan 5",
			});
			const event3 = createTestEvent({
				id: "e3",
				date: "2025-01-06",
				title: "Jan 6 Event",
			});

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));
			Effect.runSync(insertEvent(event3));

			const jan5Events = Effect.runSync(findEventsByDate("2025-01-05"));
			expect(jan5Events).toHaveLength(2);
			expect(jan5Events.every((e) => e.date === "2025-01-05")).toBe(true);

			const jan6Events = Effect.runSync(findEventsByDate("2025-01-06"));
			expect(jan6Events).toHaveLength(1);
			expect(at(jan6Events, 0).title).toBe("Jan 6 Event");
		});

		test("returns empty array when no events for date", () => {
			const event = createTestEvent({ date: "2025-01-05" });
			Effect.runSync(insertEvent(event));

			const events = Effect.runSync(findEventsByDate("2025-12-25"));
			expect(events).toHaveLength(0);
		});

		test("orders events by start time", () => {
			const event1 = createTestEvent({
				id: "e1",
				date: "2025-01-05",
				title: "Afternoon",
				startTime: 840,
			});
			const event2 = createTestEvent({
				id: "e2",
				date: "2025-01-05",
				title: "Morning",
				startTime: 540,
			});
			const event3 = createTestEvent({
				id: "e3",
				date: "2025-01-05",
				title: "All Day",
			}); // No time

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));
			Effect.runSync(insertEvent(event3));

			const events = Effect.runSync(findEventsByDate("2025-01-05"));
			expect(events).toHaveLength(3);
			// NULLS FIRST means all-day events come first
			expect(at(events, 0).title).toBe("All Day");
			expect(at(events, 1).title).toBe("Morning");
			expect(at(events, 2).title).toBe("Afternoon");
		});
	});

	describe("findAllEvents", () => {
		test("returns all events ordered by date and time", () => {
			const events = [
				createTestEvent({
					id: "e1",
					date: "2025-01-06",
					title: "Jan 6",
					startTime: 540,
				}),
				createTestEvent({
					id: "e2",
					date: "2025-01-05",
					title: "Jan 5 Afternoon",
					startTime: 840,
				}),
				createTestEvent({
					id: "e3",
					date: "2025-01-05",
					title: "Jan 5 Morning",
					startTime: 540,
				}),
				createTestEvent({
					id: "e4",
					date: "2025-01-05",
					title: "Jan 5 All Day",
				}),
			];

			for (const event of events) {
				Effect.runSync(insertEvent(event));
			}

			const allEvents = Effect.runSync(findAllEvents());
			expect(allEvents).toHaveLength(4);

			// Should be ordered by date first, then by time (NULLS FIRST)
			expect(at(allEvents, 0).title).toBe("Jan 5 All Day");
			expect(at(allEvents, 1).title).toBe("Jan 5 Morning");
			expect(at(allEvents, 2).title).toBe("Jan 5 Afternoon");
			expect(at(allEvents, 3).title).toBe("Jan 6");
		});

		test("returns empty array when no events exist", () => {
			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(0);
		});
	});

	describe("updateEventById", () => {
		test("updates event title", () => {
			const event = createTestEvent({ id: "e1", title: "Original Title" });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { title: "Updated Title" }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).title).toBe("Updated Title");
		});

		test("updates event date", () => {
			const event = createTestEvent({ id: "e1", date: "2025-01-05" });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { date: "2025-02-10" }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).date).toBe("2025-02-10");
		});

		test("updates event color", () => {
			const event = createTestEvent({ id: "e1", color: "blue" });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { color: "red" }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).color).toBe("red");
		});

		test("updates event start time", () => {
			const event = createTestEvent({ id: "e1", startTime: 540 });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { startTime: 600 }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).startTime).toBe(600);
		});

		test("updates event end time", () => {
			const event = createTestEvent({ id: "e1", startTime: 540, endTime: 600 });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { endTime: 660 }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).endTime).toBe(660);
		});

		test("updates conference url", () => {
			const event = createTestEvent({ id: "e1" });
			Effect.runSync(insertEvent(event));

			Effect.runSync(
				updateEventById("e1", {
					conferenceUrl: "https://meet.google.com/updated-link",
				}),
			);

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).conferenceUrl).toBe(
				"https://meet.google.com/updated-link",
			);
		});

		test("clears start time by setting to undefined", () => {
			const event = createTestEvent({ id: "e1", startTime: 540 });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { startTime: undefined }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).startTime).toBeUndefined();
		});

		test("clears end time by setting to undefined", () => {
			const event = createTestEvent({ id: "e1", startTime: 540, endTime: 600 });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", { endTime: undefined }));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).endTime).toBeUndefined();
		});

		test("updates multiple fields at once", () => {
			const event = createTestEvent({
				id: "e1",
				title: "Original",
				date: "2025-01-05",
				color: "gray",
				startTime: 540,
			});
			Effect.runSync(insertEvent(event));

			Effect.runSync(
				updateEventById("e1", {
					title: "Updated",
					date: "2025-02-01",
					color: "green",
					startTime: 600,
					endTime: 720,
				}),
			);

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0)).toMatchObject({
				id: "e1",
				title: "Updated",
				date: "2025-02-01",
				color: "green",
				startTime: 600,
				endTime: 720,
			});
		});

		test("does nothing when no updates provided", () => {
			const event = createTestEvent({ id: "e1", title: "Original" });
			Effect.runSync(insertEvent(event));

			Effect.runSync(updateEventById("e1", {}));

			const events = Effect.runSync(findAllEvents());
			expect(at(events, 0).title).toBe("Original");
		});

		test("only updates the specified event", () => {
			const event1 = createTestEvent({ id: "e1", title: "Event 1" });
			const event2 = createTestEvent({ id: "e2", title: "Event 2" });
			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));

			Effect.runSync(updateEventById("e1", { title: "Updated Event 1" }));

			const events = Effect.runSync(findAllEvents());
			const e1 = events.find((e) => e.id === "e1");
			const e2 = events.find((e) => e.id === "e2");
			expect(e1?.title).toBe("Updated Event 1");
			expect(e2?.title).toBe("Event 2");
		});
	});

	describe("deleteEventById", () => {
		test("deletes an existing event and returns true", () => {
			const event = createTestEvent({ id: "e1", title: "To Delete" });
			Effect.runSync(insertEvent(event));

			const deleted = Effect.runSync(deleteEventById("e1"));
			expect(deleted).toBe(true);

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(0);
		});

		test("returns false when event does not exist", () => {
			const deleted = Effect.runSync(deleteEventById("non-existent-id"));
			expect(deleted).toBe(false);
		});

		test("only deletes the specified event", () => {
			const event1 = createTestEvent({ id: "e1", title: "Keep" });
			const event2 = createTestEvent({ id: "e2", title: "Delete" });
			const event3 = createTestEvent({ id: "e3", title: "Also Keep" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));
			Effect.runSync(insertEvent(event3));

			Effect.runSync(deleteEventById("e2"));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(2);
			expect(events.some((e) => e.id === "e1")).toBe(true);
			expect(events.some((e) => e.id === "e2")).toBe(false);
			expect(events.some((e) => e.id === "e3")).toBe(true);
		});

		test("can delete all events one by one", () => {
			const event1 = createTestEvent({ id: "e1" });
			const event2 = createTestEvent({ id: "e2" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));

			Effect.runSync(deleteEventById("e1"));
			Effect.runSync(deleteEventById("e2"));

			const events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(0);
		});
	});

	describe("getMaxEventIdCounter", () => {
		test("returns 0 when no events exist", () => {
			const maxCounter = Effect.runSync(getMaxEventIdCounter());
			expect(maxCounter).toBe(0);
		});

		test("returns the highest counter from event IDs", () => {
			const event1 = createTestEvent({ id: "event-5-1234567890" });
			const event2 = createTestEvent({ id: "event-10-1234567890" });
			const event3 = createTestEvent({ id: "event-3-1234567890" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));
			Effect.runSync(insertEvent(event3));

			const maxCounter = Effect.runSync(getMaxEventIdCounter());
			expect(maxCounter).toBe(10);
		});

		test("handles single event", () => {
			const event = createTestEvent({ id: "event-42-1234567890" });
			Effect.runSync(insertEvent(event));

			const maxCounter = Effect.runSync(getMaxEventIdCounter());
			expect(maxCounter).toBe(42);
		});

		test("ignores events with non-standard ID format", () => {
			const event1 = createTestEvent({ id: "event-5-1234567890" });
			const event2 = createTestEvent({ id: "custom-id" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));

			const maxCounter = Effect.runSync(getMaxEventIdCounter());
			expect(maxCounter).toBe(5);
		});

		test("updates after deleting the max counter event", () => {
			const event1 = createTestEvent({ id: "event-5-1234567890" });
			const event2 = createTestEvent({ id: "event-10-1234567890" });

			Effect.runSync(insertEvent(event1));
			Effect.runSync(insertEvent(event2));

			// Delete the event with highest counter
			Effect.runSync(deleteEventById("event-10-1234567890"));

			const maxCounter = Effect.runSync(getMaxEventIdCounter());
			expect(maxCounter).toBe(5);
		});
	});

	describe("Integration - Full CRUD lifecycle", () => {
		test("complete event lifecycle: create, read, update, delete", () => {
			// CREATE
			const event = createTestEvent({
				id: "event-1-lifecycle",
				title: "Lifecycle Test",
				date: "2025-01-05",
				color: "blue",
				startTime: 540,
			});
			Effect.runSync(insertEvent(event));

			// READ - verify creation
			let events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(at(events, 0).title).toBe("Lifecycle Test");

			// UPDATE
			Effect.runSync(
				updateEventById("event-1-lifecycle", {
					title: "Updated Lifecycle",
					color: "red",
					endTime: 660,
				}),
			);

			// READ - verify update
			events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(1);
			expect(at(events, 0).title).toBe("Updated Lifecycle");
			expect(at(events, 0).color).toBe("red");
			expect(at(events, 0).endTime).toBe(660);

			// DELETE
			const deleted = Effect.runSync(deleteEventById("event-1-lifecycle"));
			expect(deleted).toBe(true);

			// READ - verify deletion
			events = Effect.runSync(findAllEvents());
			expect(events).toHaveLength(0);
		});

		test("multiple events with different dates", () => {
			const dates = ["2025-01-01", "2025-01-15", "2025-02-01", "2025-12-31"];

			for (let i = 0; i < dates.length; i++) {
				const event = createTestEvent({
					id: `event-${i}-multidate`,
					date: dates[i],
					title: `Event on ${dates[i]}`,
				});
				Effect.runSync(insertEvent(event));
			}

			// Verify all events exist
			const allEvents = Effect.runSync(findAllEvents());
			expect(allEvents).toHaveLength(4);

			// Verify each date has exactly one event
			for (const date of dates) {
				const dateEvents = Effect.runSync(findEventsByDate(date));
				expect(dateEvents).toHaveLength(1);
			}
		});
	});
});

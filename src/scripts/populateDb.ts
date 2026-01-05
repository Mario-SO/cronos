import type { CalendarEvent, ColorName } from "@core/types";
import { initDatabase, closeDatabase } from "@db/index";
import { getMaxEventIdCounter, insertEvent } from "@db/repository";
import { formatDateKey } from "@lib/dateUtils";
import { Effect } from "effect";

const COLORS: ColorName[] = [
	"gray",
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
];

const TITLES = [
	"Standup",
	"Planning",
	"Design review",
	"Team offsite",
	"Client check-in",
	"Release prep",
	"Bug bash",
	"Roadmap sync",
	"Deep work",
	"Workshop",
	"Research",
	"Retrospective",
];

const DATE_SEEDS: Array<[number, number, number]> = [
	[2018, 0, 3],
	[2018, 6, 22],
	[2019, 2, 14],
	[2019, 9, 5],
	[2020, 1, 29],
	[2020, 11, 31],
	[2021, 3, 12],
	[2021, 7, 19],
	[2022, 4, 8],
	[2022, 10, 2],
	[2023, 0, 17],
	[2023, 8, 26],
	[2024, 2, 1],
	[2024, 6, 15],
	[2025, 1, 9],
	[2025, 9, 23],
	[2026, 5, 4],
	[2027, 11, 20],
	[2029, 7, 7],
	[2031, 3, 28],
];

function makeEvent(
	index: number,
	counterRef: { value: number },
): CalendarEvent {
	const [year, month, day] = DATE_SEEDS[index % DATE_SEEDS.length];
	const dateKey = formatDateKey(new Date(year, month, day));
	const isAllDay = index % 5 === 0;

	let startTime: number | undefined;
	let endTime: number | undefined;
	if (!isAllDay) {
		const startBase = 8 * 60 + ((index * 53) % (10 * 60));
		const duration = 30 + ((index * 29) % 120);
		startTime = startBase;
		endTime = Math.min(startBase + duration, 23 * 60 + 45);
	}

	counterRef.value += 1;
	const id = `event-${counterRef.value}-${Date.now()}-${index}`;

	return {
		id,
		date: dateKey,
		title: `${TITLES[index % TITLES.length]} ${index + 1}`,
		startTime,
		endTime,
		color: COLORS[index % COLORS.length],
	};
}

function main(): void {
	initDatabase();

	const counterRef = { value: Effect.runSync(getMaxEventIdCounter()) };
	const events: CalendarEvent[] = [];
	const count = 20;

	for (let i = 0; i < count; i++) {
		events.push(makeEvent(i, counterRef));
	}

	for (const event of events) {
		Effect.runSync(insertEvent(event));
	}

	closeDatabase();
	const targetDb = process.env.CRONOS_DB_PATH ?? "default database";
	console.log(`Inserted ${events.length} events into ${targetDb}.`);
}

main();

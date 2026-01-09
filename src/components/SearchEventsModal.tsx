import {
	buildHelpKeyMap,
	getActiveBindings,
	getCommandContext,
	joinHelpKeys,
	setSearchModalCommandHandlers,
} from "@core/commands";
import type { CalendarEvent } from "@core/types";
import { useModalDimensions } from "@hooks/useModalDimensions";
import { SEARCH_MODAL_TITLE_LENGTH } from "@lib/constants";
import { formatTimeRange, parseDateKey } from "@lib/dateUtils";
import type { ScrollBoxRenderable } from "@opentui/core";
import { deleteEvent, getAllEvents } from "@state/events";
import { useTheme } from "@state/theme";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModalFrame } from "./ModalFrame";

interface SearchEventsModalProps {
	onGoToDate: (date: Date) => void;
	onEdit: (event: CalendarEvent) => void;
}

type SearchEntry =
	| { type: "event"; event: CalendarEvent }
	| {
			type: "group";
			title: string;
			color: CalendarEvent["color"];
			count: number;
			latest: CalendarEvent;
	  };

/** Fuzzy match score - returns -1 for no match, higher score = better match */
function fuzzyMatch(query: string, text: string): number {
	const queryLower = query.toLowerCase();
	const textLower = text.toLowerCase();

	// Empty query matches everything with score 0
	if (queryLower.length === 0) return 0;

	// Check if all query chars appear in order
	let queryIndex = 0;
	let score = 0;
	let consecutiveBonus = 0;

	for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
		if (textLower[i] === queryLower[queryIndex]) {
			// Bonus for consecutive matches
			score += 1 + consecutiveBonus;
			consecutiveBonus += 1;

			// Bonus for matching at start of word
			if (i === 0 || textLower[i - 1] === " ") {
				score += 2;
			}

			queryIndex++;
		} else {
			consecutiveBonus = 0;
		}
	}

	// All query chars must be found
	if (queryIndex < queryLower.length) return -1;

	return score;
}

function getEntryEvent(entry: SearchEntry): CalendarEvent {
	return entry.type === "group" ? entry.latest : entry.event;
}

/** Format a date for display */
function formatEventDate(dateKey: string): string {
	const date = parseDateKey(dateKey);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function groupEventsForSearch(events: CalendarEvent[]): SearchEntry[] {
	const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
	const groups = new Map<string, CalendarEvent[]>();
	for (const event of sorted) {
		const key = `${event.title}::${event.color}`;
		const current = groups.get(key) ?? [];
		current.push(event);
		groups.set(key, current);
	}

	const entries: SearchEntry[] = [];
	for (const groupEvents of groups.values()) {
		if (groupEvents.length === 1) {
			const event = groupEvents[0];
			if (event) entries.push({ type: "event", event });
			continue;
		}
		const latest = groupEvents[0];
		if (!latest) continue;
		entries.push({
			type: "group",
			title: latest.title,
			color: latest.color,
			count: groupEvents.length,
			latest,
		});
	}

	entries.sort((a, b) => {
		const aEvent = getEntryEvent(a);
		const bEvent = getEntryEvent(b);
		return bEvent.date.localeCompare(aEvent.date);
	});

	return entries;
}

export function SearchEventsModal({
	onGoToDate,
	onEdit,
}: SearchEventsModalProps) {
	const { width: modalWidth, height: modalHeight } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.8,
		maxWidthPercent: 0.9,
		minHeight: 14,
		heightPercent: 0.75,
		maxHeightPercent: 0.85,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const theme = useTheme();
	const ui = theme.ui;
	// Local snapshot since the event store is external to React.
	const [allEvents, setAllEvents] = useState<CalendarEvent[]>(() =>
		Effect.runSync(getAllEvents),
	);
	// Calculate visible events: modalHeight - fixed elements - container borders
	// Fixed elements: title(1+margin=2) + input(3+margin=4) + help(1+margin=2) + padding(2) = 10
	// Container needs: visibleEvents + 2 (borders)
	// So: visibleEvents = modalHeight - 10 - 2 = modalHeight - 12
	const visibleEvents = Math.max(
		4,
		modalHeight - 12, // Reserve space: title(2) + input(4) + help(2) + padding(2) + borders(2) = 12
	);
	// Calculate responsive widths for date and time columns
	const dateWidth = Math.max(12, Math.floor(modalWidth * 0.12)); // Date format: "Apr 28, 2031" ~12 chars
	const timeWidth = Math.max(13, Math.floor(modalWidth * 0.12)); // Time format: "2:47pm-4:28pm" ~13 chars

	// Filter and sort events based on search query
	const filteredEntries = useMemo<SearchEntry[]>(() => {
		if (searchQuery.trim() === "") {
			// Group recurring-like events by exact title + color.
			return groupEventsForSearch(allEvents);
		}

		// Calculate fuzzy match scores
		const scored = allEvents
			.map((event) => ({
				event,
				score: fuzzyMatch(searchQuery, event.title),
			}))
			.filter((item) => item.score >= 0);

		// Sort by score (highest first), then by date
		scored.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.event.date.localeCompare(a.event.date);
		});

		return scored.map(
			(item): SearchEntry => ({ type: "event", event: item.event }),
		);
	}, [allEvents, searchQuery]);

	// Clamp selected index if list shrunk
	const clampedIndex = Math.min(
		selectedIndex,
		Math.max(0, filteredEntries.length - 1),
	);

	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	// Scroll to keep selected item visible
	useEffect(() => {
		if (scrollboxRef.current && filteredEntries.length > 0) {
			const targetScrollTop = Math.max(0, clampedIndex - visibleEvents + 1);
			scrollboxRef.current.scrollTop = targetScrollTop;
		}
	}, [clampedIndex, filteredEntries.length, visibleEvents]);

	const moveSelection = useCallback(
		(delta: number) => {
			if (filteredEntries.length === 0) return;
			setSelectedIndex((prev) => {
				const next = prev + delta;
				if (next < 0) return 0;
				if (next > filteredEntries.length - 1)
					return filteredEntries.length - 1;
				return next;
			});
		},
		[filteredEntries.length],
	);

	const goToSelection = useCallback(() => {
		const entry = filteredEntries[clampedIndex];
		if (!entry) return;
		const event = getEntryEvent(entry);
		const date = parseDateKey(event.date);
		onGoToDate(date);
	}, [clampedIndex, filteredEntries, onGoToDate]);

	const editSelection = useCallback(() => {
		const entry = filteredEntries[clampedIndex];
		if (!entry) return;
		onEdit(getEntryEvent(entry));
	}, [clampedIndex, filteredEntries, onEdit]);

	const deleteSelection = useCallback(() => {
		const entry = filteredEntries[clampedIndex];
		if (!entry) return;
		const event = getEntryEvent(entry);

		Effect.runSync(deleteEvent(event.id));
		if (selectedIndex >= filteredEntries.length - 1 && selectedIndex > 0) {
			setSelectedIndex(selectedIndex - 1);
		}
		setAllEvents(Effect.runSync(getAllEvents));
	}, [clampedIndex, filteredEntries, selectedIndex]);

	const searchHandlers = useMemo(
		() => ({ moveSelection, goToSelection, editSelection, deleteSelection }),
		[moveSelection, goToSelection, editSelection, deleteSelection],
	);

	useEffect(() => {
		setSearchModalCommandHandlers(searchHandlers);
		return () => setSearchModalCommandHandlers(null);
	}, [searchHandlers]);

	const ctx = getCommandContext();
	const bindings = getActiveBindings(ctx, { layerIds: ["modal:search"] });
	const keyMap = buildHelpKeyMap(bindings);
	const normalizeKey = (key: string) => {
		if (key === "Up") return "↑";
		if (key === "Down") return "↓";
		return key;
	};
	const buildKeys = (commandIds: string[], order?: string[]) =>
		joinHelpKeys(keyMap, commandIds, { order, normalizeKey });
	const helpParts: string[] = [];
	const navKeys = buildKeys(
		["modal.search.moveUp", "modal.search.moveDown"],
		["↑", "↓"],
	);
	if (navKeys) {
		helpParts.push(`${navKeys} Navigate`);
	}
	const goKeys = buildKeys(["modal.search.goTo", "modal.search.edit"]);
	if (goKeys) {
		helpParts.push(`${goKeys} Open`);
	}
	const deleteKeys = buildKeys(["modal.search.delete"]);
	if (deleteKeys) {
		helpParts.push(`${deleteKeys} Delete`);
	}
	const closeKeys = buildKeys(["modal.close"], ["Esc"]);
	if (closeKeys) {
		helpParts.push(`${closeKeys} Close`);
	}
	const helpText = helpParts.length > 0 ? helpParts.join(" | ") : "";

	return (
		<ModalFrame width={modalWidth} height={modalHeight}>
			{/* Title */}
			<text fg={ui.selected} style={{ marginBottom: 1 }}>
				Search Events{searchQuery.trim() === "" ? " (grouped)" : ""}
			</text>

			{/* Search Input */}
			<box
				style={{
					border: true,
					borderColor: ui.selected,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="Type to search..."
					value={searchQuery}
					focused
					onInput={(value) => {
						setSearchQuery(value);
						setSelectedIndex(0);
					}}
				/>
			</box>

			{/* Event List */}
			<box
				style={{
					flexDirection: "column",
					height: visibleEvents + 2,
					border: true,
					borderColor: ui.border,
					overflow: "hidden",
				}}
			>
				{filteredEntries.length === 0 ? (
					<text fg={ui.foregroundDim} style={{ padding: 1 }}>
						{allEvents.length === 0 ? "No events yet" : "No matching events"}
					</text>
				) : (
					<scrollbox
						ref={scrollboxRef}
						focused={false}
						style={{ height: visibleEvents }}
					>
						{filteredEntries.map((entry, index) => {
							const event = getEntryEvent(entry);
							const isSelected = index === clampedIndex;
							const meta =
								entry.type === "group"
									? `↻ x${entry.count}`
									: formatTimeRange(event.startTime, event.endTime);
							return (
								<box
									key={event.id}
									style={{
										flexDirection: "row",
										backgroundColor: isSelected ? ui.backgroundAlt : undefined,
										padding: 0,
										paddingLeft: 1,
									}}
								>
									<text fg={theme.eventColors[event.color]}>●</text>
									<text
										fg={ui.foregroundDim}
										style={{ marginLeft: 1, width: dateWidth }}
									>
										{formatEventDate(event.date)}
									</text>
									<text
										fg={ui.foregroundDim}
										style={{ marginLeft: 1, width: timeWidth }}
									>
										{meta}
									</text>
									<text
										fg={isSelected ? ui.foreground : ui.foregroundDim}
										style={{ marginLeft: 1 }}
									>
										{entry.type === "group"
											? `${entry.title} (${entry.count})`.slice(
													0,
													SEARCH_MODAL_TITLE_LENGTH,
												)
											: event.title.slice(0, SEARCH_MODAL_TITLE_LENGTH)}
									</text>
									{isSelected && (
										<text fg={ui.selected} style={{ marginLeft: 1 }}>
											◀
										</text>
									)}
								</box>
							);
						})}
					</scrollbox>
				)}
			</box>

			{/* Help */}
			{helpText && (
				<box style={{ marginTop: 1 }}>
					<text fg={ui.foregroundDim}>{helpText}</text>
				</box>
			)}
		</ModalFrame>
	);
}

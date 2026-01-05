import type { CalendarEvent } from "@core/types";
import { getColorHex, THEME } from "@lib/colors";
import { formatTimeRange, parseDateKey } from "@lib/dateUtils";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { getAllEvents } from "@state/events";
import { Effect } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_MODAL_VISIBLE_EVENTS = 8;
const SEARCH_MODAL_TITLE_LENGTH = 24;

interface SearchEventsModalProps {
	onClose: () => void;
	onGoToDate: (date: Date) => void;
	onEdit: (event: CalendarEvent) => void;
}

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

/** Format a date for display */
function formatEventDate(dateKey: string): string {
	const date = parseDateKey(dateKey);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function SearchEventsModal({
	onClose,
	onGoToDate,
	onEdit,
}: SearchEventsModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const prevQueryRef = useRef(searchQuery);

	// Get all events
	const allEvents = useMemo(() => Effect.runSync(getAllEvents), []);

	// Filter and sort events based on search query
	const filteredEvents = useMemo(() => {
		if (searchQuery.trim() === "") {
			// Show all events sorted by date (most recent first)
			return [...allEvents].sort((a, b) => b.date.localeCompare(a.date));
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

		return scored.map((item) => item.event);
	}, [allEvents, searchQuery]);

	// Reset selection when query changes
	if (prevQueryRef.current !== searchQuery) {
		prevQueryRef.current = searchQuery;
		if (selectedIndex !== 0) {
			setSelectedIndex(0);
		}
	}

	// Clamp selected index if list shrunk
	const clampedIndex = Math.min(
		selectedIndex,
		Math.max(0, filteredEvents.length - 1),
	);

	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	// Scroll to keep selected item visible
	useEffect(() => {
		if (scrollboxRef.current && filteredEvents.length > 0) {
			const targetScrollTop = Math.max(
				0,
				clampedIndex - SEARCH_MODAL_VISIBLE_EVENTS + 1,
			);
			scrollboxRef.current.scrollTop = targetScrollTop;
		}
	}, [clampedIndex, filteredEvents.length]);

	useKeyboard((key) => {
		if (key.name === "escape" || key.name === "s") {
			onClose();
			return;
		}

		if (filteredEvents.length === 0) return;

		if (key.name === "down") {
			key.preventDefault();
			setSelectedIndex((prev) => Math.min(prev + 1, filteredEvents.length - 1));
		} else if (key.name === "up") {
			key.preventDefault();
			setSelectedIndex((prev) => Math.max(prev - 1, 0));
		} else if (key.name === "return") {
			const event = filteredEvents[clampedIndex];
			if (event) {
				const date = parseDateKey(event.date);
				onGoToDate(date);
			}
		} else if (key.name === "e") {
			const event = filteredEvents[clampedIndex];
			if (event) {
				onEdit(event);
			}
		}
	});

	return (
		<box
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				width: 56,
				height: 18,
				marginTop: -9,
				marginLeft: -28,
				backgroundColor: THEME.background,
				border: true,
				borderStyle: "double",
				borderColor: THEME.borderHighlight,
				flexDirection: "column",
				padding: 1,
			}}
		>
			{/* Title */}
			<text fg={THEME.selected} style={{ marginBottom: 1 }}>
				Search Events
			</text>

			{/* Search Input */}
			<box
				style={{
					border: true,
					borderColor: THEME.selected,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="Type to search..."
					value={searchQuery}
					focused
					onInput={setSearchQuery}
				/>
			</box>

			{/* Event List */}
			<box
				style={{
					flexDirection: "column",
					height: SEARCH_MODAL_VISIBLE_EVENTS + 2,
					border: true,
					borderColor: THEME.border,
					overflow: "hidden",
				}}
			>
				{filteredEvents.length === 0 ? (
					<text fg={THEME.foregroundDim} style={{ padding: 1 }}>
						{allEvents.length === 0 ? "No events yet" : "No matching events"}
					</text>
				) : (
					<scrollbox
						ref={scrollboxRef}
						focused={false}
						style={{ height: SEARCH_MODAL_VISIBLE_EVENTS }}
					>
						{filteredEvents.map((event, index) => {
							const isSelected = index === clampedIndex;
							return (
								<box
									key={event.id}
									style={{
										flexDirection: "row",
										backgroundColor: isSelected
											? THEME.backgroundAlt
											: undefined,
										padding: 0,
										paddingLeft: 1,
									}}
								>
									<text fg={getColorHex(event.color)}>●</text>
									<text
										fg={THEME.foregroundDim}
										style={{ marginLeft: 1, width: 12 }}
									>
										{formatEventDate(event.date)}
									</text>
									<text fg={THEME.foregroundDim} style={{ width: 10 }}>
										{formatTimeRange(event.startTime, event.endTime)}
									</text>
									<text
										fg={isSelected ? THEME.foreground : THEME.foregroundDim}
										style={{ marginLeft: 1 }}
									>
										{event.title.slice(0, SEARCH_MODAL_TITLE_LENGTH)}
									</text>
									{isSelected && (
										<text fg={THEME.selected} style={{ marginLeft: 1 }}>
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
			<box style={{ marginTop: 1 }}>
				<text fg={THEME.foregroundDim}>
					↑/↓ Navigate | Enter Go to date | E Edit | Esc/S Close
				</text>
			</box>
		</box>
	);
}

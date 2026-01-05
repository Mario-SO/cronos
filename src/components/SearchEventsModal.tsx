import type { CalendarEvent } from "@core/types";
import { useModalDimensions } from "@hooks/useModalDimensions";
import { getColorHex, THEME } from "@lib/colors";
import { SEARCH_MODAL_TITLE_LENGTH } from "@lib/constants";
import { formatTimeRange, parseDateKey } from "@lib/dateUtils";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { deleteEvent, getAllEvents } from "@state/events";
import { Effect } from "effect";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ModalFrame } from "./ModalFrame";

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
	// Force re-render after delete since events come from external store
	const [eventsVersion, forceUpdate] = useReducer((x) => x + 1, 0);
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

	// Get all events
	const allEvents = useMemo(
		() => Effect.runSync(getAllEvents),
		[eventsVersion],
	);

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
	useEffect(() => {
		setSelectedIndex(0);
	}, [searchQuery]);

	// Clamp selected index if list shrunk
	const clampedIndex = Math.min(
		selectedIndex,
		Math.max(0, filteredEvents.length - 1),
	);

	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	// Scroll to keep selected item visible
	useEffect(() => {
		if (scrollboxRef.current && filteredEvents.length > 0) {
			const targetScrollTop = Math.max(0, clampedIndex - visibleEvents + 1);
			scrollboxRef.current.scrollTop = targetScrollTop;
		}
	}, [clampedIndex, filteredEvents.length, visibleEvents]);

	useKeyboard((key) => {
		// Don't allow 's' key to close the modal
		if (key.name === "escape") {
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
		} else if (key.ctrl && key.name === "e") {
			const event = filteredEvents[clampedIndex];
			if (event) {
				onEdit(event);
			}
		} else if (key.ctrl && key.name === "d") {
			const event = filteredEvents[clampedIndex];
			if (event) {
				Effect.runSync(deleteEvent(event.id));
				// Adjust selection if we're at the end
				if (selectedIndex >= filteredEvents.length - 1 && selectedIndex > 0) {
					setSelectedIndex(selectedIndex - 1);
				}
				// Force re-render to reflect the deletion immediately
				forceUpdate();
			}
		}
	});

	return (
		<ModalFrame width={modalWidth} height={modalHeight}>
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
					height: visibleEvents + 2,
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
						style={{ height: visibleEvents }}
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
										style={{ marginLeft: 1, width: dateWidth }}
									>
										{formatEventDate(event.date)}
									</text>
									<text
										fg={THEME.foregroundDim}
										style={{ marginLeft: 1, width: timeWidth }}
									>
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
		</ModalFrame>
	);
}

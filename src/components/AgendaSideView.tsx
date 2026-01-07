import type { CalendarEvent } from "@core/types";
import { getColorHex, THEME } from "@lib/colors";
import { formatDateKey, formatTimeRange } from "@lib/dateUtils";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { deleteEvent, useEventsForDate } from "@state/events";
import { Effect } from "effect";
import { useEffect, useReducer, useRef, useState } from "react";

interface AgendaSideViewProps {
	selectedDate: Date;
	width: number;
	height: number;
	isActive: boolean;
	onEdit: (event: CalendarEvent) => void;
	onEventsChanged: () => void;
}

export function AgendaSideView({
	selectedDate,
	width,
	height,
	isActive,
	onEdit,
	onEventsChanged,
}: AgendaSideViewProps) {
	const dateKey = formatDateKey(selectedDate);
	const events = useEventsForDate(dateKey);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [, forceUpdate] = useReducer((x) => x + 1, 0);

	const clampedIndex = Math.min(selectedIndex, Math.max(0, events.length - 1));

	useEffect(() => {
		setSelectedIndex(0);
	}, []);

	useEffect(() => {
		setSelectedIndex((prev) => Math.min(prev, Math.max(0, events.length - 1)));
	}, [events.length]);

	// Outer border + padding(1) consume 4 rows; header + help + list borders consume 4.
	const visibleEvents = Math.max(2, height - 8);
	const innerWidth = Math.max(12, width - 4);
	const listContentWidth = Math.max(8, innerWidth - 2);
	const rowOverhead = 5; // bullet + margins + selection indicator
	const rowContentWidth = Math.max(4, listContentWidth - rowOverhead);
	const minTitleWidth = Math.min(4, rowContentWidth);
	const maxTimeWidth = Math.max(0, rowContentWidth - minTitleWidth);
	const minTimeWidth = Math.min(3, maxTimeWidth);
	const desiredTimeWidth = Math.floor(rowContentWidth * 0.4);
	const timeWidth = Math.max(
		minTimeWidth,
		Math.min(desiredTimeWidth, maxTimeWidth),
	);
	const titleWidth = Math.max(1, rowContentWidth - timeWidth);

	const formattedDate = selectedDate.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	useEffect(() => {
		if (scrollboxRef.current && events.length > 0) {
			const targetScrollTop = Math.max(0, clampedIndex - visibleEvents + 1);
			scrollboxRef.current.scrollTop = targetScrollTop;
		}
	}, [clampedIndex, events.length, visibleEvents]);

	useKeyboard((key) => {
		if (!isActive) return;
		if (events.length === 0) return;

		if (key.name === "down") {
			key.preventDefault?.();
			setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1));
		} else if (key.name === "up") {
			key.preventDefault?.();
			setSelectedIndex((prev) => Math.max(prev - 1, 0));
		} else if (key.name === "e") {
			const event = events[clampedIndex];
			if (event) {
				onEdit(event);
			}
		} else if (key.name === "d") {
			const event = events[clampedIndex];
			if (event) {
				Effect.runSync(deleteEvent(event.id));
				if (selectedIndex >= events.length - 1 && selectedIndex > 0) {
					setSelectedIndex(selectedIndex - 1);
				}
				forceUpdate();
				onEventsChanged();
			}
		}
	});

	return (
		<box
			style={{
				width,
				height,
				border: true,
				borderStyle: "single",
				borderColor: THEME.borderHighlight,
				flexDirection: "column",
				padding: 1,
			}}
		>
			<text fg={THEME.selected}>Agenda - {formattedDate}</text>

			<box
				style={{
					flexDirection: "column",
					height: visibleEvents + 2,
					border: true,
					borderColor: THEME.border,
					overflow: "hidden",
				}}
			>
				{events.length === 0 ? (
					<text fg={THEME.foregroundDim} style={{ padding: 1 }}>
						No events for this day
					</text>
				) : (
					<scrollbox
						ref={scrollboxRef}
						focused={false}
						style={{ height: visibleEvents }}
					>
						{events.map((event, index) => {
							const isSelected = index === clampedIndex;
							return (
								<box
									key={event.id}
									style={{
										flexDirection: "row",
										backgroundColor: isSelected
											? THEME.backgroundAlt
											: undefined,
										paddingLeft: 1,
									}}
								>
									<text fg={getColorHex(event.color)}>●</text>
									<text
										fg={THEME.foregroundDim}
										style={{ marginLeft: 1, width: timeWidth }}
									>
										{formatTimeRange(event.startTime, event.endTime)}
									</text>
									<text
										fg={isSelected ? THEME.foreground : THEME.foregroundDim}
										style={{ marginLeft: 1, width: titleWidth }}
									>
										{event.title.slice(0, titleWidth)}
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

			<text fg={THEME.foregroundDim}>
				↑/↓ Navigate | E Edit | D Delete | V Toggle
			</text>
		</box>
	);
}

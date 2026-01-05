import type { CalendarEvent } from "@core/types";
import { useModalDimensions } from "@hooks/useModalDimensions";
import { getColorHex, THEME } from "@lib/colors";
import { VIEW_MODAL_TITLE_LENGTH } from "@lib/constants";
import { formatDateKey, formatTimeRange } from "@lib/dateUtils";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { deleteEvent, useEventsForDate } from "@state/events";
import { Effect } from "effect";
import { useEffect, useReducer, useRef, useState } from "react";
import { ModalFrame } from "./ModalFrame";

interface ViewEventsModalProps {
	selectedDate: Date;
	onClose: () => void;
	onEdit: (event: CalendarEvent) => void;
}

export function ViewEventsModal({
	selectedDate,
	onClose,
	onEdit,
}: ViewEventsModalProps) {
	const { width: modalWidth, height: modalHeight } = useModalDimensions({
		minWidth: 45,
		widthPercent: 0.7,
		maxWidthPercent: 0.85,
		minHeight: 12,
		heightPercent: 0.6,
		maxHeightPercent: 0.8,
	});
	const dateKey = formatDateKey(selectedDate);
	const events = useEventsForDate(dateKey);
	const [selectedIndex, setSelectedIndex] = useState(0);
	// Force re-render after delete since events come from external store
	const [, forceUpdate] = useReducer((x) => x + 1, 0);

	// Calculate visible events: modalHeight - fixed elements - container borders
	// Fixed elements: title(1+margin=2) + help(1+margin=2) + padding(2) = 6
	// Container needs: visibleEvents + 2 (borders)
	// So: visibleEvents = modalHeight - 6 - 2 = modalHeight - 8
	const visibleEvents = Math.max(
		4,
		modalHeight - 8, // Reserve space: title(2) + help(2) + padding(2) + borders(2) = 8
	);
	// Calculate responsive time width: use 15-20% of modal width, min 14 chars for "2:47pm-4:28pm"
	const timeWidth = Math.max(14, Math.floor(modalWidth * 0.15));

	// Clamp selectedIndex if events list shrunk (e.g., after delete)
	const clampedIndex = Math.min(selectedIndex, Math.max(0, events.length - 1));

	useKeyboard((key) => {
		if (key.name === "escape" || key.name === "v") {
			onClose();
			return;
		}

		if (events.length === 0) return;

		if (key.name === "j" || key.name === "down") {
			setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1));
		} else if (key.name === "k" || key.name === "up") {
			setSelectedIndex((prev) => Math.max(prev - 1, 0));
		} else if (key.name === "h" || key.name === "left") {
			setSelectedIndex((prev) => Math.max(prev - 1, 0));
		} else if (key.name === "l" || key.name === "right") {
			setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1));
		} else if (key.name === "e") {
			const event = events[selectedIndex];
			if (event) {
				onEdit(event);
			}
		} else if (key.name === "d") {
			const event = events[selectedIndex];
			if (event) {
				Effect.runSync(deleteEvent(event.id));
				// Adjust selection if we're at the end
				if (selectedIndex >= events.length - 1 && selectedIndex > 0) {
					setSelectedIndex(selectedIndex - 1);
				}
				// Force re-render to reflect the deletion immediately
				forceUpdate();
			}
		}
	});

	const formattedDate = selectedDate.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	// Scroll to keep selected item visible
	useEffect(() => {
		if (scrollboxRef.current && events.length > 0) {
			// Each event row is 1 line tall, calculate target scroll position
			const targetScrollTop = Math.max(0, clampedIndex - visibleEvents + 1);
			scrollboxRef.current.scrollTop = targetScrollTop;
		}
	}, [clampedIndex, events.length, visibleEvents]);

	return (
		<ModalFrame width={modalWidth} height={modalHeight}>
			{/* Title */}
			<text fg={THEME.selected} style={{ marginBottom: 1 }}>
				Events - {formattedDate}
			</text>

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
										padding: 0,
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
										style={{ marginLeft: 1 }}
									>
										{event.title.slice(0, VIEW_MODAL_TITLE_LENGTH)}
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
					J/K Navigate | E Edit | D Delete | Esc/V Close
				</text>
			</box>
		</ModalFrame>
	);
}

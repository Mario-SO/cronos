import { useKeyboard } from "@opentui/react";
import { Effect } from "effect";
import { useState } from "react";
import { getColorHex, THEME } from "../lib/colors";
import { formatDateKey, formatTimeRange } from "../lib/dateUtils";
import { parseEventInput, reconstructEventInput } from "../lib/eventParser";
import { addEvent, updateEvent } from "../state/events";
import type { CalendarEvent } from "../types";

interface AddEventModalProps {
	selectedDate: Date;
	editingEvent?: CalendarEvent;
	onClose: () => void;
	onSave: () => void;
}

export function AddEventModal({
	selectedDate,
	editingEvent,
	onClose,
	onSave,
}: AddEventModalProps) {
	const initialValue = editingEvent ? reconstructEventInput(editingEvent) : "";
	const [inputValue, setInputValue] = useState(initialValue);

	const parsed = parseEventInput(inputValue);
	const dateKey = formatDateKey(selectedDate);

	useKeyboard((key) => {
		if (key.name === "escape") {
			onClose();
		}
	});

	const handleSubmit = (value: string) => {
		const finalParsed = parseEventInput(value);
		if (!finalParsed.title.trim()) {
			return; // Don't save empty events
		}

		if (editingEvent) {
			// Update existing event
			Effect.runSync(
				updateEvent(editingEvent.id, {
					title: finalParsed.title,
					startTime: finalParsed.startTime,
					endTime: finalParsed.endTime,
					color: finalParsed.color,
				}),
			);
		} else {
			// Create new event
			Effect.runSync(
				addEvent(
					dateKey,
					finalParsed.title,
					finalParsed.startTime,
					finalParsed.endTime,
					finalParsed.color,
				),
			);
		}

		onSave();
	};

	const formattedDate = selectedDate.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return (
		<box
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				width: 50,
				height: 16,
				marginTop: -8,
				marginLeft: -25,
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
				{editingEvent ? "Edit Event" : "Add Event"} - {formattedDate}
			</text>

			{/* Input */}
			<box
				style={{
					border: true,
					borderColor: THEME.border,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="Title 2pm-3pm #blue"
					value={inputValue}
					focused
					onInput={setInputValue}
					onSubmit={handleSubmit}
				/>
			</box>

			{/* Live Preview */}
			<box style={{ flexDirection: "column", marginTop: 1 }}>
				<box style={{ flexDirection: "row" }}>
					<text fg={THEME.foregroundDim}>Title: </text>
					<text fg={parsed.title ? THEME.foreground : THEME.error}>
						{parsed.title || "(enter a title)"}
					</text>
				</box>
				<box style={{ flexDirection: "row" }}>
					<text fg={THEME.foregroundDim}>Time: </text>
					<text fg={THEME.foreground}>
						{formatTimeRange(parsed.startTime, parsed.endTime)}
					</text>
				</box>
				<box style={{ flexDirection: "row" }}>
					<text fg={THEME.foregroundDim}>Color: </text>
					<text fg={getColorHex(parsed.color)}>● {parsed.color}</text>
				</box>
			</box>

			{/* Help */}
			<box style={{ marginTop: 1 }}>
				<text fg={THEME.foregroundDim}>Enter to save | Esc to cancel</text>
			</box>
		</box>
	);
}

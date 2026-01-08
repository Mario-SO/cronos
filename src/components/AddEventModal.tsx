import {
	formatHelpText,
	getActiveBindings,
	getCommandContext,
	setAddModalCommandHandlers,
} from "@core/commands";
import type { CalendarEvent } from "@core/types";
import { useModalDimensions } from "@hooks/useModalDimensions";
import { formatDateKey, formatTimeRange } from "@lib/dateUtils";
import { parseEventInput, reconstructEventInput } from "@lib/eventParser";
import { addEvent, updateEvent } from "@state/events";
import { useTheme } from "@state/theme";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";
import { ModalFrame } from "./ModalFrame";

interface AddEventModalProps {
	selectedDate: Date;
	editingEvent?: CalendarEvent;
	onSave: () => void;
}

export function AddEventModal({
	selectedDate,
	editingEvent,
	onSave,
}: AddEventModalProps) {
	const { width: modalWidth, height: modalHeight } = useModalDimensions({
		minWidth: 45,
		widthPercent: 0.7,
		maxWidthPercent: 0.85,
		minHeight: 12,
		heightPercent: 0.6,
		maxHeightPercent: 0.8,
	});
	const initialValue = editingEvent ? reconstructEventInput(editingEvent) : "";
	const [inputValue, setInputValue] = useState(initialValue);
	const theme = useTheme();
	const ui = theme.ui;

	const parsed = parseEventInput(inputValue);
	const dateKey = formatDateKey(selectedDate);

	const handleSubmit = useCallback(
		(value: string) => {
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
		},
		[dateKey, editingEvent, onSave],
	);

	const submit = useCallback(() => {
		handleSubmit(inputValue);
	}, [handleSubmit, inputValue]);

	useEffect(() => {
		setAddModalCommandHandlers({ submit });
		return () => setAddModalCommandHandlers(null);
	}, [submit]);

	const helpText = formatHelpText(
		getActiveBindings(getCommandContext(), { layerIds: ["modal:add"] }),
	);

	const formattedDate = selectedDate.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return (
		<ModalFrame width={modalWidth} height={modalHeight}>
			{/* Title */}
			<text fg={ui.selected} style={{ marginBottom: 1 }}>
				{editingEvent ? "Edit Event" : "Add Event"} - {formattedDate}
			</text>

			{/* Input */}
			<box
				style={{
					border: true,
					borderColor: ui.border,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="Title 2pm-3pm #blue"
					value={inputValue}
					focused
					onInput={setInputValue}
				/>
			</box>

			{/* Live Preview */}
			<box style={{ flexDirection: "column", marginTop: 1 }}>
				<box style={{ flexDirection: "row" }}>
					<text fg={ui.foregroundDim}>Title: </text>
					<text fg={parsed.title ? ui.foreground : ui.error}>
						{parsed.title || "(enter a title)"}
					</text>
				</box>
				<box style={{ flexDirection: "row" }}>
					<text fg={ui.foregroundDim}>Time: </text>
					<text fg={ui.foreground}>
						{formatTimeRange(parsed.startTime, parsed.endTime)}
					</text>
				</box>
				<box style={{ flexDirection: "row" }}>
					<text fg={ui.foregroundDim}>Color: </text>
					<text fg={theme.eventColors[parsed.color]}>● {parsed.color}</text>
				</box>
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

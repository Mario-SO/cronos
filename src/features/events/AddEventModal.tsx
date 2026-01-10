import { formatLayerHelpText, setAddModalCommandHandlers } from "@app/commands";
import {
	parseEventInput,
	reconstructEventInput,
} from "@features/events/eventParser";
import { addEvent, updateEvent } from "@features/events/eventsState";
import { createGoogleMeetEvent } from "@features/google/googleSync";
import { pushToast } from "@features/overlays/toastState";
import { useSettings } from "@features/settings/settingsState";
import { useTheme } from "@features/theme/themeState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { formatDateKey, formatTimeRange } from "@shared/dateUtils";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

interface AddEventModalProps {
	selectedDate: Date;
	editingEvent?: CalendarEvent;
	onSave: () => void;
}

type FocusedField = "title" | "invite";

function parseInviteList(value: string): string[] {
	const unique = new Set<string>();
	for (const raw of value.split(",")) {
		const email = raw.trim();
		if (!email) continue;
		unique.add(email);
	}
	return Array.from(unique);
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
	const initialInviteValue = editingEvent?.attendees?.join(", ") ?? "";
	const [inputValue, setInputValue] = useState(initialValue);
	const [inviteValue, setInviteValue] = useState(initialInviteValue);
	const [focusedField, setFocusedField] = useState<FocusedField>("title");
	const theme = useTheme();
	const settings = useSettings();
	const ui = theme.ui;

	const parsed = parseEventInput(inputValue);
	const dateKey = formatDateKey(selectedDate);
	const googleConnected = settings.google.connected;

	const handleSubmit = useCallback(
		(value: string) => {
			const finalParsed = parseEventInput(value);
			const attendees = parseInviteList(inviteValue);
			if (!finalParsed.title.trim()) {
				return; // Don't save empty events
			}

			let savedEvent: CalendarEvent | null = null;
			if (editingEvent) {
				// Update existing event
				savedEvent = Effect.runSync(
					updateEvent(editingEvent.id, {
						title: finalParsed.title,
						startTime: finalParsed.startTime,
						endTime: finalParsed.endTime,
						color: finalParsed.color,
						attendees,
					}),
				);
			} else {
				// Create new event
				savedEvent = Effect.runSync(
					addEvent(
						dateKey,
						finalParsed.title,
						finalParsed.startTime,
						finalParsed.endTime,
						finalParsed.color,
						attendees,
					),
				);
			}

			if (!savedEvent) {
				return;
			}

			onSave();

			if (
				finalParsed.googleMeet &&
				!savedEvent.conferenceUrl &&
				!savedEvent.googleEventId
			) {
				void Effect.runPromise(
					createGoogleMeetEvent(savedEvent).pipe(
						Effect.flatMap((googleEvent) =>
							updateEvent(savedEvent.id, googleEvent),
						),
						Effect.catchAll((error) => {
							const rawMessage =
								error instanceof Error
									? error.message
									: "Google Meet setup failed";
							const message =
								rawMessage.length > 60
									? `${rawMessage.slice(0, 57)}...`
									: rawMessage;
							return pushToast(`Google Meet failed: ${message}`, {
								tone: "error",
							}).pipe(Effect.as(null));
						}),
					),
				);
			}
		},
		[dateKey, editingEvent, inviteValue, onSave],
	);

	const focusNextField = useCallback(() => {
		setFocusedField((prev) => (prev === "title" ? "invite" : "title"));
	}, []);

	const focusPrevField = useCallback(() => {
		setFocusedField((prev) => (prev === "title" ? "invite" : "title"));
	}, []);

	const submit = useCallback(() => {
		handleSubmit(inputValue);
	}, [handleSubmit, inputValue]);

	useEffect(() => {
		setAddModalCommandHandlers({ focusNextField, focusPrevField, submit });
		return () => setAddModalCommandHandlers(null);
	}, [focusNextField, focusPrevField, submit]);

	const helpText = formatLayerHelpText(["modal:add"]);

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
					borderColor: focusedField === "title" ? ui.selected : ui.border,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="Title 2pm-3pm #blue !g"
					value={inputValue}
					focused={focusedField === "title"}
					onInput={setInputValue}
				/>
			</box>

			{/* Invite Input */}
			<text fg={ui.foregroundDim}>Invite:</text>
			<box
				style={{
					border: true,
					borderColor: focusedField === "invite" ? ui.selected : ui.border,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					placeholder="email@example.com, friend@example.com"
					value={inviteValue}
					focused={focusedField === "invite"}
					onInput={setInviteValue}
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
				<box style={{ flexDirection: "row" }}>
					<text fg={ui.foregroundDim}>Google Meet: </text>
					<text
						fg={
							parsed.googleMeet
								? googleConnected
									? ui.foreground
									: ui.warning
								: ui.foregroundDim
						}
					>
						{parsed.googleMeet
							? googleConnected
								? "yes"
								: "yes (connect Google)"
							: "no"}
					</text>
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

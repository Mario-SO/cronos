import { Effect, Ref } from "effect";
import { useCallback, useState } from "react";
import { AddEventModal } from "./components/AddEventModal";
import { CalendarView } from "./components/CalendarView";
import { GoToDateModal } from "./components/GoToDateModal";
import { ViewEventsModal } from "./components/ViewEventsModal";
import { useShortcutHandler } from "./keyboard";
import { THEME } from "./lib/colors";
import { calendarStateRef, goToDate } from "./state/calendar";
import { closeModal, openEditModal, useModalState } from "./state/modal";
import type { CalendarEvent, Scope } from "./types";

export function App() {
	// Force re-render when state changes
	const [, forceUpdate] = useState(0);
	const triggerUpdate = useCallback(() => forceUpdate((n) => n + 1), []);

	// Read state synchronously
	const calendarState = Effect.runSync(Ref.get(calendarStateRef));
	const modalState = useModalState();

	// Local state for editing event (UI-specific, not part of global modal state)
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(
		undefined,
	);

	// Determine current scope for shortcut handling
	const scope: Scope = modalState.type === "none" ? "root" : modalState.type;

	// Wire up keyboard shortcuts
	useShortcutHandler({
		scope,
		onCommandExecuted: triggerUpdate,
	});

	const handleCloseModal = useCallback(() => {
		Effect.runSync(closeModal);
		setEditingEvent(undefined);
		triggerUpdate();
	}, [triggerUpdate]);

	const handleSaveEvent = useCallback(() => {
		Effect.runSync(closeModal);
		setEditingEvent(undefined);
		triggerUpdate();
	}, [triggerUpdate]);

	const handleEditEvent = useCallback(
		(event: CalendarEvent) => {
			setEditingEvent(event);
			Effect.runSync(openEditModal(event));
			triggerUpdate();
		},
		[triggerUpdate],
	);

	const handleGoToDate = useCallback(
		(date: Date) => {
			Effect.runSync(goToDate(date));
			Effect.runSync(closeModal);
			triggerUpdate();
		},
		[triggerUpdate],
	);

	return (
		<box
			style={{
				flexGrow: 1,
				backgroundColor: THEME.background,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Calendar View */}
			<CalendarView state={calendarState} />

			{/* Modals */}
			{modalState.type === "add" && (
				<AddEventModal
					selectedDate={calendarState.selectedDate}
					editingEvent={editingEvent ?? modalState.editingEvent}
					onClose={handleCloseModal}
					onSave={handleSaveEvent}
				/>
			)}

			{modalState.type === "view" && (
				<ViewEventsModal
					selectedDate={calendarState.selectedDate}
					onClose={handleCloseModal}
					onEdit={handleEditEvent}
				/>
			)}

			{modalState.type === "goto" && (
				<GoToDateModal
					currentDate={calendarState.selectedDate}
					onClose={handleCloseModal}
					onGo={handleGoToDate}
				/>
			)}

			{/* Quit hint */}
			<box style={{ position: "absolute", bottom: 0, right: 1 }}>
				<text fg={THEME.foregroundDim}>Q to quit</text>
			</box>
		</box>
	);
}

import { AddEventModal } from "@components/AddEventModal";
import { AgendaSideView } from "@components/AgendaSideView";
import { CalendarView } from "@components/CalendarView";
import { GoToDateModal } from "@components/GoToDateModal";
import { SearchEventsModal } from "@components/SearchEventsModal";
import { useShortcutHandler } from "@core/keyboard";
import type { CalendarEvent, Scope } from "@core/types";
import { useTerminalSize } from "@hooks/useTerminalSize";
import { THEME } from "@lib/colors";
import { useAgendaState } from "@state/agenda";
import { calendarStateRef, goToDate } from "@state/calendar";
import { closeModal, openEditModal, useModalState } from "@state/modal";
import { Effect, Ref } from "effect";
import { useCallback, useState } from "react";

export function App() {
	// Force re-render when state changes
	const [, forceUpdate] = useState(0);
	const triggerUpdate = useCallback(() => forceUpdate((n) => n + 1), []);

	// Read state synchronously
	const calendarState = Effect.runSync(Ref.get(calendarStateRef));
	const modalState = useModalState();
	const agendaState = useAgendaState();
	const terminalSize = useTerminalSize();

	// Determine current scope for shortcut handling
	const scope: Scope = modalState.type === "none" ? "root" : modalState.type;

	// Wire up keyboard shortcuts
	useShortcutHandler({
		scope,
		onCommandExecuted: triggerUpdate,
	});

	const handleCloseModal = useCallback(() => {
		Effect.runSync(closeModal);
		triggerUpdate();
	}, [triggerUpdate]);

	const handleSaveEvent = useCallback(() => {
		Effect.runSync(closeModal);
		triggerUpdate();
	}, [triggerUpdate]);

	const handleEditEvent = useCallback(
		(event: CalendarEvent) => {
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

	const minCalendarWidth = 58;
	const minAgendaWidth = 18;
	const agendaGutter = 2;
	const targetAgendaWidth = Math.min(
		52,
		Math.max(24, Math.floor(terminalSize.width * 0.32)),
	);
	const maxAgendaWidth = terminalSize.width - minCalendarWidth - agendaGutter;
	const agendaWidth = Math.min(targetAgendaWidth, maxAgendaWidth);
	const agendaHeight = Math.max(10, terminalSize.height - 2);
	const agendaVisible = agendaState.isOpen && agendaWidth >= minAgendaWidth;
	const calendarWidth = agendaVisible
		? terminalSize.width - agendaWidth - agendaGutter
		: terminalSize.width;

	return (
		<box
			style={{
				flexGrow: 1,
				backgroundColor: THEME.background,
				flexDirection: "row",
				alignItems: "stretch",
			}}
		>
			<box
				style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
			>
				{/* Calendar View */}
				<CalendarView
					state={calendarState}
					availableWidth={calendarWidth}
					availableHeight={terminalSize.height}
				/>
			</box>

			{agendaVisible && (
				<box style={{ marginLeft: agendaGutter, justifyContent: "center" }}>
					<AgendaSideView
						selectedDate={calendarState.selectedDate}
						width={agendaWidth}
						height={agendaHeight}
						isActive={modalState.type === "none"}
						onEdit={handleEditEvent}
						onEventsChanged={triggerUpdate}
					/>
				</box>
			)}

			{/* Modals */}
			{modalState.type === "add" && (
				<AddEventModal
					selectedDate={calendarState.selectedDate}
					editingEvent={modalState.editingEvent}
					onClose={handleCloseModal}
					onSave={handleSaveEvent}
				/>
			)}

			{modalState.type === "goto" && (
				<GoToDateModal
					currentDate={calendarState.selectedDate}
					onClose={handleCloseModal}
					onGo={handleGoToDate}
				/>
			)}

			{modalState.type === "search" && (
				<SearchEventsModal
					onClose={handleCloseModal}
					onGoToDate={handleGoToDate}
					onEdit={handleEditEvent}
				/>
			)}

			{/* Quit hint */}
			<box style={{ position: "absolute", bottom: 0, right: 1 }}>
				<text fg={THEME.foregroundDim}>Q to quit</text>
			</box>
		</box>
	);
}

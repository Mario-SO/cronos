import { AddEventModal } from "@components/AddEventModal";
import { AgendaSideView } from "@components/AgendaSideView";
import { CalendarView } from "@components/CalendarView";
import { GoToDateModal } from "@components/GoToDateModal";
import { SearchEventsModal } from "@components/SearchEventsModal";
import {
	formatHelpText,
	getActiveBindings,
	getCommandContext,
} from "@core/commands";
import { useCommandHandler } from "@core/keyboard";
import type { CalendarEvent } from "@core/types";
import { useTerminalSize } from "@hooks/useTerminalSize";
import { THEME } from "@lib/colors";
import { useAgendaState } from "@state/agenda";
import { goToDate, useCalendarState } from "@state/calendar";
import { closeModal, openEditModal, useModalState } from "@state/modal";
import { Effect } from "effect";
import { useCallback } from "react";

export function App() {
	// Read state via SubscriptionRef
	const calendarState = useCalendarState();
	const modalState = useModalState();
	const agendaState = useAgendaState();
	const terminalSize = useTerminalSize();

	// Wire up keyboard shortcuts
	useCommandHandler();

	const quitHint = (() => {
		const ctx = getCommandContext();
		const bindings = getActiveBindings(ctx, { layerIds: ["global"] });
		const quitBinding = bindings.find(
			(binding) => binding.commandId === "app.quit",
		);
		return quitBinding ? formatHelpText([quitBinding]) : "";
	})();

	const handleSaveEvent = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	const handleEditEvent = useCallback((event: CalendarEvent) => {
		Effect.runSync(openEditModal(event));
	}, []);

	const handleGoToDate = useCallback((date: Date) => {
		Effect.runSync(goToDate(date));
		Effect.runSync(closeModal);
	}, []);

	const minCalendarWidth = 58;
	const minAgendaWidth = 18;
	const minTotalWidth = minCalendarWidth + minAgendaWidth;
	const agendaGutter = Math.max(
		0,
		Math.min(2, terminalSize.width - minTotalWidth),
	);
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
				style={{
					width: calendarWidth,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{/* Calendar View */}
				<CalendarView
					state={calendarState}
					availableWidth={calendarWidth}
					availableHeight={terminalSize.height}
				/>
			</box>

			{agendaVisible && (
				<box
					style={{
						width: agendaWidth,
						marginLeft: agendaGutter,
						justifyContent: "center",
					}}
				>
					<AgendaSideView
						selectedDate={calendarState.selectedDate}
						width={agendaWidth}
						height={agendaHeight}
						isActive={modalState.type === "none"}
						onEdit={handleEditEvent}
					/>
				</box>
			)}

			{/* Modals */}
			{modalState.type === "add" && (
				<AddEventModal
					selectedDate={calendarState.selectedDate}
					editingEvent={modalState.editingEvent}
					onSave={handleSaveEvent}
				/>
			)}

			{modalState.type === "goto" && (
				<GoToDateModal
					currentDate={calendarState.selectedDate}
					onGo={handleGoToDate}
				/>
			)}

			{modalState.type === "search" && (
				<SearchEventsModal
					onGoToDate={handleGoToDate}
					onEdit={handleEditEvent}
				/>
			)}

			{/* Quit hint */}
			{quitHint && (
				<box style={{ position: "absolute", bottom: 0, right: 1 }}>
					<text fg={THEME.foregroundDim}>{quitHint}</text>
				</box>
			)}
		</box>
	);
}

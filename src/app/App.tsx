import {
	formatHelpText,
	getActiveBindings,
	getCommandContext,
} from "@app/commands";
import { useCommandHandler } from "@app/keyboard";
import { AgendaSideView } from "@features/agenda/AgendaSideView";
import { useAgendaState } from "@features/agenda/agendaState";
import { CalendarView } from "@features/calendar/CalendarView";
import { goToDate, useCalendarState } from "@features/calendar/calendarState";
import { GoToDateModal } from "@features/calendar/GoToDateModal";
import { YearlyCalendarView } from "@features/calendar/YearlyCalendarView";
import { AddEventModal } from "@features/events/AddEventModal";
import { SearchEventsModal } from "@features/events/SearchEventsModal";
import {
	closeModal,
	openEditModal,
	useModalState,
} from "@features/overlays/modalState";
import { SettingsModal } from "@features/settings/SettingsModal";
import { useTheme } from "@features/theme/themeState";
import { useTerminalSize } from "@shared/hooks/useTerminalSize";
import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";
import { useCallback } from "react";

export function App() {
	// Read state via SubscriptionRef
	const calendarState = useCalendarState();
	const modalState = useModalState();
	const agendaState = useAgendaState();
	const terminalSize = useTerminalSize();
	const ui = useTheme().ui;

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
				backgroundColor: ui.background,
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
				{calendarState.viewMode === "year" ? (
					<YearlyCalendarView
						state={calendarState}
						availableWidth={calendarWidth}
						availableHeight={terminalSize.height}
					/>
				) : (
					<CalendarView
						state={calendarState}
						availableWidth={calendarWidth}
						availableHeight={terminalSize.height}
					/>
				)}
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

			{modalState.type === "settings" && <SettingsModal />}

			{/* Quit hint */}
			{quitHint && (
				<box style={{ position: "absolute", bottom: 0, right: 1 }}>
					<text fg={ui.foregroundDim}>{quitHint}</text>
				</box>
			)}
		</box>
	);
}

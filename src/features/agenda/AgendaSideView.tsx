import { buildHelpText, setAgendaCommandHandlers } from "@app/commands";
import { deleteEvent, useEventsForDate } from "@features/events/eventsState";
import { useTheme } from "@features/theme/themeState";
import type { ScrollBoxRenderable } from "@opentui/core";
import { formatDateKey, formatTimeRange } from "@shared/dateUtils";
import type { CalendarEvent } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface AgendaSideViewProps {
	selectedDate: Date;
	width: number;
	height: number;
	isActive: boolean;
	onEdit: (event: CalendarEvent) => void;
}

export function AgendaSideView({
	selectedDate,
	width,
	height,
	isActive,
	onEdit,
}: AgendaSideViewProps) {
	const dateKey = formatDateKey(selectedDate);
	const events = useEventsForDate(dateKey);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const theme = useTheme();
	const ui = theme.ui;

	const clampedIndex = Math.min(selectedIndex, Math.max(0, events.length - 1));

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

	const moveSelection = useCallback(
		(delta: number) => {
			if (!isActive || events.length === 0) return;
			setSelectedIndex((prev) => {
				const next = prev + delta;
				if (next < 0) return 0;
				if (next > events.length - 1) return events.length - 1;
				return next;
			});
		},
		[events.length, isActive],
	);

	const editSelection = useCallback(() => {
		if (!isActive) return;
		const event = events[clampedIndex];
		if (event) {
			onEdit(event);
		}
	}, [clampedIndex, events, isActive, onEdit]);

	const deleteSelection = useCallback(() => {
		if (!isActive) return;
		const event = events[clampedIndex];
		if (event) {
			Effect.runSync(deleteEvent(event.id));
			if (selectedIndex >= events.length - 1 && selectedIndex > 0) {
				setSelectedIndex(selectedIndex - 1);
			}
		}
	}, [clampedIndex, events, isActive, selectedIndex]);

	const agendaHandlers = useMemo(
		() => ({ moveSelection, editSelection, deleteSelection }),
		[moveSelection, editSelection, deleteSelection],
	);

	useEffect(() => {
		setAgendaCommandHandlers(agendaHandlers);
		return () => setAgendaCommandHandlers(null);
	}, [agendaHandlers]);

	const normalizeKey = (key: string) => {
		if (key === "Up") return "↑";
		if (key === "Down") return "↓";
		return key;
	};
	const helpText = buildHelpText(
		["agenda"],
		[
			{
				commandIds: ["agenda.moveUp", "agenda.moveDown"],
				label: "Navigate",
				order: ["↑", "↓"],
			},
			{ commandIds: ["agenda.edit"], label: "Edit" },
			{ commandIds: ["agenda.delete"], label: "Delete" },
			{ commandIds: ["calendar.toggleAgenda"], label: "Toggle" },
		],
		{ normalizeKey },
	);

	return (
		<box
			style={{
				width,
				height,
				border: true,
				borderStyle: "single",
				borderColor: ui.borderHighlight,
				flexDirection: "column",
				padding: 1,
			}}
		>
			<text fg={ui.selected}>Agenda - {formattedDate}</text>

			<box
				style={{
					flexDirection: "column",
					height: visibleEvents + 2,
					border: true,
					borderColor: ui.border,
					overflow: "hidden",
				}}
			>
				{events.length === 0 ? (
					<text fg={ui.foregroundDim} style={{ padding: 1 }}>
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
										backgroundColor: isSelected ? ui.backgroundAlt : undefined,
										paddingLeft: 1,
									}}
								>
									<text fg={theme.eventColors[event.color]}>●</text>
									<text
										fg={ui.foregroundDim}
										style={{ marginLeft: 1, width: timeWidth }}
									>
										{formatTimeRange(event.startTime, event.endTime)}
									</text>
									<text
										fg={isSelected ? ui.foreground : ui.foregroundDim}
										style={{ marginLeft: 1, width: titleWidth }}
									>
										{event.title.slice(0, titleWidth)}
									</text>
									{isSelected && (
										<text fg={ui.selected} style={{ marginLeft: 1 }}>
											◀
										</text>
									)}
								</box>
							);
						})}
					</scrollbox>
				)}
			</box>

			{helpText && <text fg={ui.foregroundDim}>{helpText}</text>}
		</box>
	);
}

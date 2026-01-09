import { buildHelpText } from "@app/commands";
import { setYearGridColumns } from "@features/calendar/calendarState";
import { useEventStore } from "@features/events/eventsState";
import { useSettings } from "@features/settings/settingsState";
import { useTheme } from "@features/theme/themeState";
import {
	formatDateKey,
	getWeekdayCompactLabels,
	getWeekdayIndex,
	isSameDay,
} from "@shared/dateUtils";
import { useTerminalSize } from "@shared/hooks/useTerminalSize";
import type { CalendarState } from "@shared/types";
import { Effect } from "effect";
import { useEffect } from "react";

interface YearlyCalendarViewProps {
	state: CalendarState;
	availableWidth?: number;
	availableHeight?: number;
}

interface YearlyLayout {
	cols: number;
	rows: number;
	cellWidth: number;
	cellHeight: number;
	mode: "stacked" | "compact";
}

const MIN_CELL_WIDTH_STACKED = 7;
const MIN_CELL_WIDTH_COMPACT = 5;
const MIN_CELL_HEIGHT_STACKED = 4;
const MIN_CELL_HEIGHT_COMPACT = 2;
function getDaysInYear(year: number): number {
	const start = new Date(year, 0, 1);
	const end = new Date(year + 1, 0, 1);
	const diffMs = end.getTime() - start.getTime();
	return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function findYearlyLayout(
	totalDays: number,
	width: number,
	height: number,
): YearlyLayout {
	const tryLayout = (
		cellHeight: number,
		mode: YearlyLayout["mode"],
		minCellWidth: number,
	): YearlyLayout | null => {
		const maxColsByWidth = Math.max(1, Math.floor(width / minCellWidth));
		const maxRows = Math.max(1, Math.floor(height / cellHeight));
		for (let cols = maxColsByWidth; cols >= 1; cols--) {
			const cellWidth = Math.floor(width / cols);
			if (cellWidth < minCellWidth) continue;
			const rows = Math.ceil(totalDays / cols);
			if (rows <= maxRows) {
				return { cols, rows, cellWidth, cellHeight, mode };
			}
		}
		return null;
	};

	return (
		tryLayout(MIN_CELL_HEIGHT_STACKED, "stacked", MIN_CELL_WIDTH_STACKED) ??
		tryLayout(MIN_CELL_HEIGHT_COMPACT, "compact", MIN_CELL_WIDTH_COMPACT) ?? {
			cols: Math.max(1, Math.floor(width / MIN_CELL_WIDTH_COMPACT)),
			rows: Math.ceil(
				totalDays / Math.max(1, Math.floor(width / MIN_CELL_WIDTH_COMPACT)),
			),
			cellWidth: Math.max(
				MIN_CELL_WIDTH_COMPACT,
				Math.floor(
					width / Math.max(1, Math.floor(width / MIN_CELL_WIDTH_COMPACT)),
				),
			),
			cellHeight: MIN_CELL_HEIGHT_COMPACT,
			mode: "compact",
		}
	);
}

export function YearlyCalendarView({
	state,
	availableWidth,
	availableHeight,
}: YearlyCalendarViewProps) {
	const terminalSize = useTerminalSize();
	const layoutWidth = availableWidth ?? terminalSize.width;
	const layoutHeight = availableHeight ?? terminalSize.height;
	const sidePadding = Math.min(8, Math.max(0, Math.floor(layoutWidth * 0.06)));
	const contentWidth = Math.max(1, layoutWidth - sidePadding * 2);
	const year = state.displayedMonth.getFullYear();
	const today = new Date();
	const totalDays = getDaysInYear(year);
	const eventStore = useEventStore();
	const settings = useSettings();
	const compactLabels = getWeekdayCompactLabels(settings.weekStartDay);
	const theme = useTheme();
	const ui = theme.ui;

	const helpText = buildHelpText(
		["global"],
		[
			{
				commandIds: [
					"calendar.prevDay",
					"calendar.nextWeek",
					"calendar.prevWeek",
					"calendar.nextDay",
				],
				label: "Days",
				order: ["H", "J", "K", "L"],
			},
			{
				commandIds: ["calendar.prevMonth", "calendar.nextMonth"],
				label: "Months",
				order: ["[", "]"],
			},
			{ commandIds: ["calendar.today"], label: "Today" },
			{ commandIds: ["calendar.toggleYearView"], label: "Month view" },
			{ commandIds: ["modal.openAdd"], label: "Add" },
			{ commandIds: ["calendar.toggleAgenda"], label: "Agenda" },
			{ commandIds: ["modal.openSearch"], label: "Search" },
			{ commandIds: ["modal.openGoto"], label: "Go to date" },
		],
	);

	const headerHeight = 1;
	const helpHeight = helpText ? 1 : 0;
	const gridHeight = Math.max(1, layoutHeight - headerHeight - helpHeight);
	const layout = findYearlyLayout(totalDays, contentWidth, gridHeight);
	const gridWidth = layout.cols * layout.cellWidth;
	const days: Date[] = [];
	for (let i = 0; i < totalDays; i++) {
		days.push(new Date(year, 0, 1 + i));
	}

	useEffect(() => {
		Effect.runSync(setYearGridColumns(layout.cols));
	}, [layout.cols]);

	return (
		<box style={{ flexDirection: "column", alignItems: "center" }}>
			<box style={{ marginBottom: 1 }}>
				<text fg={ui.foreground}>{year}</text>
			</box>

			<box
				style={{
					flexDirection: "column",
					width: gridWidth + sidePadding * 2,
					paddingLeft: sidePadding,
					paddingRight: sidePadding,
				}}
			>
				{Array.from({ length: layout.rows }).map((_, rowIndex) => {
					const rowStartDate = new Date(year, 0, 1 + rowIndex * layout.cols);
					const rowKey = `row-${formatDateKey(rowStartDate)}`;
					return (
						<box key={rowKey} style={{ flexDirection: "row" }}>
							{Array.from({ length: layout.cols }).map((_, colIndex) => {
								const index = rowIndex * layout.cols + colIndex;
								if (index >= totalDays) {
									const padDate = new Date(year, 0, 1 + index);
									return (
										<box
											key={`pad-${formatDateKey(padDate)}`}
											style={{
												width: layout.cellWidth,
												height: layout.cellHeight,
											}}
										/>
									);
								}

								const date = days[index];
								if (!date) return null;
								const dateKey = formatDateKey(date);
								const events = eventStore.get(dateKey) ?? [];
								const displayEvents = events.slice(0, 3);
								const isSelected = isSameDay(date, state.selectedDate);
								const isToday = isSameDay(date, today);
								const isMonthStart = date.getDate() === 1;
								const monthLabel = isMonthStart
									? date.toLocaleString("en-US", { month: "short" })
									: "";
								const weekdayIndex = getWeekdayIndex(
									date,
									settings.weekStartDay,
								);
								const weekdayLabel = compactLabels[weekdayIndex] ?? "";
								const headerLabel = monthLabel || weekdayLabel;
								const dayText = String(date.getDate()).padStart(2, "0");
								const bgColor = isSelected ? ui.selected : undefined;
								const dayFgColor = isSelected
									? ui.background
									: isToday
										? ui.today
										: isMonthStart
											? ui.accentAlt
											: ui.foreground;
								const borderColor = isSelected
									? ui.selected
									: isToday
										? ui.today
										: isMonthStart
											? ui.accentAlt
											: ui.border;
								const showBorder = layout.mode !== "compact";

								return (
									<box
										key={dateKey}
										style={{
											width: layout.cellWidth,
											height: layout.cellHeight,
											backgroundColor: bgColor,
											flexDirection: "column",
											border: showBorder,
											borderStyle: showBorder ? "single" : undefined,
											borderColor: showBorder ? borderColor : undefined,
										}}
									>
										{layout.mode === "compact" ? (
											<>
												<text fg={ui.foregroundDim}>{headerLabel}</text>
												<text fg={dayFgColor}>{dayText}</text>
											</>
										) : (
											<>
												<box style={{ flexDirection: "row" }}>
													<text fg={dayFgColor}>{dayText}</text>
													<text fg={ui.foregroundDim} style={{ marginLeft: 1 }}>
														{headerLabel}
													</text>
												</box>
												<box style={{ flexDirection: "row" }}>
													{displayEvents.map((event) => (
														<text
															key={event.id}
															fg={theme.eventColors[event.color]}
														>
															●
														</text>
													))}
												</box>
											</>
										)}
									</box>
								);
							})}
						</box>
					);
				})}
			</box>

			{helpText && (
				<box style={{ marginTop: 1 }}>
					<text fg={ui.foregroundDim}>{helpText}</text>
				</box>
			)}
		</box>
	);
}

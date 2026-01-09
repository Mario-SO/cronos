import type { ThemeUi } from "@shared/themes";
import type { FocusArea, WeekStartOptionId } from "../types";

interface WeekStartOption {
	id: WeekStartOptionId;
	label: string;
}

interface CalendarSectionProps {
	ui: ThemeUi;
	focusArea: FocusArea;
	draftWeekStart: WeekStartOptionId;
	weekStartOptions: ReadonlyArray<WeekStartOption>;
	labelWidth: number;
	appliedWeekStartLabel: string;
}

export function CalendarSection({
	ui,
	focusArea,
	draftWeekStart,
	weekStartOptions,
	labelWidth,
	appliedWeekStartLabel,
}: CalendarSectionProps) {
	return (
		<>
			<box style={{ flexDirection: "row", marginBottom: 1 }}>
				<text fg={ui.foregroundDim} style={{ width: labelWidth }}>
					Week start
				</text>
				<box style={{ flexDirection: "column" }}>
					{weekStartOptions.map((option) => {
						const isSelected = option.id === draftWeekStart;
						const fg = isSelected ? ui.selected : ui.foreground;
						const isFocused = focusArea === "fields" && isSelected;
						return (
							<box
								key={option.id}
								style={{
									backgroundColor: isFocused ? ui.selection : undefined,
								}}
							>
								<text fg={fg}>
									{isFocused ? "> " : "  "}
									{isSelected ? "(x)" : "( )"} {option.label}
								</text>
							</box>
						);
					})}
				</box>
			</box>

			<text fg={ui.foregroundDim}>Saved: {appliedWeekStartLabel}</text>
		</>
	);
}

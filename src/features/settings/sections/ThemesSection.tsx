import type { ThemeOption, ThemeUi } from "@shared/themes";
import type { FocusArea } from "../types";

interface ThemesSectionProps {
	ui: ThemeUi;
	focusArea: FocusArea;
	draftTheme: string;
	themeOptions: ThemeOption[];
}

export function ThemesSection({
	ui,
	focusArea,
	draftTheme,
	themeOptions,
}: ThemesSectionProps) {
	return (
		<box style={{ flexDirection: "column", marginBottom: 1 }}>
			{themeOptions.map((option) => {
				const isSelected = option.id === draftTheme;
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
	);
}

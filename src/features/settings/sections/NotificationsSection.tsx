import type { ThemeUi } from "@shared/themes";
import type { FocusArea, NotificationsField } from "../types";

interface NotificationsSectionProps {
	ui: ThemeUi;
	focusArea: FocusArea;
	notificationsField: NotificationsField;
	draftNotificationsEnabled: boolean;
	draftNotificationMinutes: string;
	leadLabelWidth: number;
	onMinutesInput: (value: string) => void;
}

export function NotificationsSection({
	ui,
	focusArea,
	notificationsField,
	draftNotificationsEnabled,
	draftNotificationMinutes,
	leadLabelWidth,
	onMinutesInput,
}: NotificationsSectionProps) {
	return (
		<>
			<box style={{ flexDirection: "column", marginBottom: 1 }}>
				{[
					{ id: 0, label: "On", value: true },
					{ id: 1, label: "Off", value: false },
				].map((option) => {
					const isSelected = draftNotificationsEnabled === option.value;
					const isFocused =
						focusArea === "fields" && notificationsField === option.id;
					const fg = isSelected ? ui.selected : ui.foreground;
					return (
						<box
							key={option.label}
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

			<box style={{ flexDirection: "row", alignItems: "center" }}>
				<text fg={ui.foregroundDim} style={{ width: leadLabelWidth }}>
					Lead time
				</text>
				<box
					style={{
						border: true,
						borderColor:
							focusArea === "fields" && notificationsField === 2
								? ui.selected
								: ui.border,
						height: 3,
						width: 8,
					}}
				>
					<input
						value={draftNotificationMinutes}
						placeholder="10"
						focused={focusArea === "fields" && notificationsField === 2}
						onInput={onMinutesInput}
					/>
				</box>
				<text fg={ui.foregroundDim} style={{ marginLeft: 1 }}>
					minutes
				</text>
			</box>
		</>
	);
}

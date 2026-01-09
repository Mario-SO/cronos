import type { ThemePalette, ThemeUi } from "@shared/themes";
import type { FocusArea, GoogleOption } from "../types";

interface SyncSectionProps {
	ui: ThemeUi;
	theme: ThemePalette;
	focusArea: FocusArea;
	googleOptions: GoogleOption[];
	googleOptionIndex: number;
	isConnected: boolean;
	status: "idle" | "syncing" | "error";
	lastSyncAt?: string;
	error?: string;
	labelWidth: number;
}

export function SyncSection({
	ui,
	theme,
	focusArea,
	googleOptions,
	googleOptionIndex,
	isConnected,
	status,
	lastSyncAt,
	error,
	labelWidth,
}: SyncSectionProps) {
	return (
		<box style={{ flexDirection: "column", marginBottom: 1 }}>
			<box style={{ flexDirection: "row", marginBottom: 1 }}>
				<text fg={ui.foregroundDim} style={{ width: labelWidth }}>
					Status
				</text>
				<text fg={ui.foreground}>
					{isConnected ? "Connected" : "Not connected"}
					{isConnected && status === "syncing" ? " (syncing)" : ""}
				</text>
			</box>
			{lastSyncAt && (
				<box style={{ flexDirection: "row", marginBottom: 1 }}>
					<text fg={ui.foregroundDim} style={{ width: labelWidth }}>
						Last sync
					</text>
					<text fg={ui.foreground}>{lastSyncAt}</text>
				</box>
			)}
			{error && <text fg={ui.warning}>Error: {error}</text>}

			<box style={{ flexDirection: "column", marginTop: 1 }}>
				{googleOptions.map((option, index) => {
					const isFocused =
						focusArea === "fields" && index === googleOptionIndex;
					const isAction = option.type === "action";
					const isDisabled = isAction ? option.disabled : false;
					const showToggle = option.type === "calendar";
					const enabled = option.type === "calendar" ? option.enabled : false;
					const canWrite = option.type === "calendar" ? option.canWrite : true;
					const fg = isDisabled ? ui.foregroundDim : ui.foreground;
					const labelPrefix = isFocused ? "> " : "  ";
					const prefix = `${labelPrefix}${showToggle ? (enabled ? "(x)" : "( )") : "   "} `;
					const dotColor =
						option.type === "calendar"
							? theme.eventColors[option.color]
							: undefined;
					return (
						<box
							key={option.id}
							style={{
								flexDirection: "row",
								backgroundColor: isFocused ? ui.selection : undefined,
							}}
						>
							<text fg={canWrite === false ? ui.foregroundDim : fg}>
								{prefix}
							</text>
							<text fg={dotColor ?? ui.foregroundDim}>
								{showToggle ? "● " : "  "}
							</text>
							<text fg={canWrite === false ? ui.foregroundDim : fg}>
								{option.label}
							</text>
						</box>
					);
				})}
			</box>
		</box>
	);
}

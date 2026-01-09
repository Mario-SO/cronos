import { buildHelpText, setSettingsModalCommandHandlers } from "@app/commands";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { closeModal } from "@features/overlays/modalState";
import { updateSettings, useSettings } from "@features/settings/settingsState";
import {
	getThemeOptions,
	setThemeId,
	useTheme,
} from "@features/theme/themeState";
import {
	connectGoogleAccount,
	disconnectGoogleAccount,
	runGoogleSync,
	toggleGoogleCalendar,
	useGoogleSyncState,
} from "@features/google/googleState";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalFrame } from "@shared/components/ModalFrame";
import { CalendarSection } from "./sections/CalendarSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { SyncSection } from "./sections/SyncSection";
import { ThemesSection } from "./sections/ThemesSection";
import type {
	FocusArea,
	GoogleOption,
	NotificationsField,
	WeekStartOptionId,
} from "./types";

const SECTIONS = [
	{ id: "calendar", label: "Calendar" },
	{ id: "notifications", label: "Notifications" },
	{ id: "sync", label: "Sync" },
	{ id: "themes", label: "Themes" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const WEEK_START_OPTIONS = [
	{ id: "monday", label: "Mon" },
	{ id: "sunday", label: "Sun" },
] as const;

export function SettingsModal() {
	const { width: modalWidth, height: modalHeight } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.65,
		maxWidthPercent: 0.85,
		minHeight: 16,
		heightPercent: 0.65,
		maxHeightPercent: 0.8,
	});
	const settings = useSettings();
	const googleState = useGoogleSyncState();
	const theme = useTheme();
	const ui = theme.ui;
	const themeOptions = useMemo(() => getThemeOptions(), []);
	const [activeSection, setActiveSection] = useState<SectionId>("calendar");
	const [focusArea, setFocusArea] = useState<FocusArea>("fields");
	const [actionIndex, setActionIndex] = useState(0);
	const [googleOptionIndex, setGoogleOptionIndex] = useState(0);
	const [draftWeekStart, setDraftWeekStart] = useState<WeekStartOptionId>(
		settings.weekStartDay,
	);
	const [draftTheme, setDraftTheme] = useState(settings.themeId);
	const [draftNotificationsEnabled, setDraftNotificationsEnabled] = useState(
		settings.notificationsEnabled,
	);
	const [draftNotificationMinutes, setDraftNotificationMinutes] = useState(
		String(settings.notificationLeadMinutes),
	);
	const [notificationsField, setNotificationsField] =
		useState<NotificationsField>(0);
	const googleOptions = useMemo<GoogleOption[]>(() => {
		const isConnected = settings.google.connected;
		const isSyncing = googleState.status === "syncing" && isConnected;
		const options: GoogleOption[] = [
			{
				type: "action",
				id: "connect",
				label: isConnected ? "Disconnect Google" : "Connect Google",
				disabled: isConnected ? false : isSyncing,
			},
			{
				type: "action",
				id: "sync",
				label: "Sync now",
				disabled: !isConnected || isSyncing,
			},
			...(isConnected
				? googleState.calendars.map(
						(calendar): GoogleOption => ({
							type: "calendar",
							id: `calendar:${calendar.calendarId}`,
							label: `${calendar.summary}${calendar.canWrite ? "" : " (read-only)"}`,
							calendarId: calendar.calendarId,
							enabled: calendar.enabled,
							color: calendar.color,
							canWrite: calendar.canWrite,
						}),
					)
				: []),
		];
		return options;
	}, [googleState.calendars, googleState.status, settings.google.connected]);

	useEffect(() => {
		if (googleOptionIndex >= googleOptions.length) {
			setGoogleOptionIndex(0);
		}
	}, [googleOptionIndex, googleOptions.length]);

	const showSections = SECTIONS.length > 1;
	const isNarrow = modalWidth < 60;
	const labelWidth = isNarrow ? 10 : 14;
	const leadLabelWidth = isNarrow ? 9 : 10;

	useEffect(() => {
		setDraftWeekStart(settings.weekStartDay);
		setDraftTheme(settings.themeId);
		setDraftNotificationsEnabled(settings.notificationsEnabled);
		setDraftNotificationMinutes(String(settings.notificationLeadMinutes));
	}, [
		settings.notificationLeadMinutes,
		settings.notificationsEnabled,
		settings.themeId,
		settings.weekStartDay,
	]);

	const parsedNotificationMinutes = Number.parseInt(
		draftNotificationMinutes,
		10,
	);
	const normalizedNotificationMinutes = Number.isFinite(
		parsedNotificationMinutes,
	)
		? parsedNotificationMinutes
		: settings.notificationLeadMinutes;
	const isDirty =
		draftWeekStart !== settings.weekStartDay ||
		draftNotificationsEnabled !== settings.notificationsEnabled ||
		normalizedNotificationMinutes !== settings.notificationLeadMinutes ||
		draftTheme !== settings.themeId;
	const appliedWeekStartLabel = useMemo(
		() =>
			WEEK_START_OPTIONS.find((option) => option.id === settings.weekStartDay)
				?.label ?? "Mon",
		[settings.weekStartDay],
	);

	const handleNotificationMinutesInput = useCallback((value: string) => {
		const sanitized = value.replace(/[^0-9]/g, "");
		setDraftNotificationMinutes(sanitized);
	}, []);

	const nextSection = useCallback(() => {
		const currentIndex = SECTIONS.findIndex(
			(section) => section.id === activeSection,
		);
		const nextIndex = (currentIndex + 1 + SECTIONS.length) % SECTIONS.length;
		const next = SECTIONS[nextIndex]?.id ?? "calendar";
		setActiveSection(next);
		if (next === "notifications") {
			setNotificationsField(0);
		}
		if (next === "sync") {
			setGoogleOptionIndex(0);
		}
	}, [activeSection]);

	const prevSection = useCallback(() => {
		const currentIndex = SECTIONS.findIndex(
			(section) => section.id === activeSection,
		);
		const nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length;
		const next = SECTIONS[nextIndex]?.id ?? "calendar";
		setActiveSection(next);
		if (next === "notifications") {
			setNotificationsField(0);
		}
		if (next === "sync") {
			setGoogleOptionIndex(0);
		}
	}, [activeSection]);

	const nextOption = useCallback(() => {
		if (focusArea === "actions") {
			setActionIndex((current) => (current + 1 > 1 ? 0 : current + 1));
			return;
		}
		if (focusArea !== "fields") return;
		if (activeSection === "calendar") {
			const currentIndex = WEEK_START_OPTIONS.findIndex(
				(option) => option.id === draftWeekStart,
			);
			const nextIndex =
				(currentIndex + 1 + WEEK_START_OPTIONS.length) %
				WEEK_START_OPTIONS.length;
			const next = WEEK_START_OPTIONS[nextIndex]?.id;
			if (next) setDraftWeekStart(next);
			return;
		}
		if (activeSection === "notifications") {
			const nextIndex = (notificationsField + 1 + 3) % 3;
			setNotificationsField(nextIndex as NotificationsField);
			if (nextIndex === 0) {
				setDraftNotificationsEnabled(true);
			} else if (nextIndex === 1) {
				setDraftNotificationsEnabled(false);
			}
			return;
		}
		if (activeSection === "sync") {
			const nextIndex =
				(googleOptionIndex + 1 + googleOptions.length) % googleOptions.length;
			setGoogleOptionIndex(nextIndex);
			return;
		}
		const currentIndex = themeOptions.findIndex(
			(option) => option.id === draftTheme,
		);
		const nextIndex =
			(currentIndex + 1 + themeOptions.length) % themeOptions.length;
		const next = themeOptions[nextIndex]?.id ?? themeOptions[0]?.id;
		if (next) setDraftTheme(next);
	}, [
		activeSection,
		draftTheme,
		draftWeekStart,
		focusArea,
		googleOptionIndex,
		googleOptions.length,
		notificationsField,
		themeOptions,
	]);

	const prevOption = useCallback(() => {
		if (focusArea === "actions") {
			setActionIndex((current) => (current - 1 < 0 ? 1 : current - 1));
			return;
		}
		if (focusArea !== "fields") return;
		if (activeSection === "calendar") {
			const currentIndex = WEEK_START_OPTIONS.findIndex(
				(option) => option.id === draftWeekStart,
			);
			const nextIndex =
				(currentIndex - 1 + WEEK_START_OPTIONS.length) %
				WEEK_START_OPTIONS.length;
			const next = WEEK_START_OPTIONS[nextIndex]?.id;
			if (next) setDraftWeekStart(next);
			return;
		}
		if (activeSection === "notifications") {
			const nextIndex = (notificationsField - 1 + 3) % 3;
			setNotificationsField(nextIndex as NotificationsField);
			if (nextIndex === 0) {
				setDraftNotificationsEnabled(true);
			} else if (nextIndex === 1) {
				setDraftNotificationsEnabled(false);
			}
			return;
		}
		if (activeSection === "sync") {
			const nextIndex =
				(googleOptionIndex - 1 + googleOptions.length) % googleOptions.length;
			setGoogleOptionIndex(nextIndex);
			return;
		}
		const currentIndex = themeOptions.findIndex(
			(option) => option.id === draftTheme,
		);
		const nextIndex =
			(currentIndex - 1 + themeOptions.length) % themeOptions.length;
		const next = themeOptions[nextIndex]?.id ?? themeOptions[0]?.id;
		if (next) setDraftTheme(next);
	}, [
		activeSection,
		draftTheme,
		draftWeekStart,
		focusArea,
		googleOptionIndex,
		googleOptions.length,
		notificationsField,
		themeOptions,
	]);

	const focusNextArea = useCallback(() => {
		const areas: FocusArea[] = ["fields", "actions"];
		setFocusArea((current) => {
			const index = Math.max(0, areas.indexOf(current));
			return areas[(index + 1) % areas.length] ?? "fields";
		});
	}, []);

	const focusPrevArea = useCallback(() => {
		const areas: FocusArea[] = ["fields", "actions"];
		setFocusArea((current) => {
			const index = Math.max(0, areas.indexOf(current));
			return areas[(index - 1 + areas.length) % areas.length] ?? "fields";
		});
	}, []);

	const activate = useCallback(() => {
		if (focusArea === "fields" && activeSection === "sync") {
			const option = googleOptions[googleOptionIndex];
			if (!option) return;
			if (option.type === "action") {
				if (option.disabled) return;
				if (option.id === "connect") {
					if (settings.google.connected) {
						void disconnectGoogleAccount();
					} else {
						void connectGoogleAccount();
					}
					return;
				}
				if (option.id === "sync") {
					void runGoogleSync();
					return;
				}
				return;
			}
			Effect.runSync(toggleGoogleCalendar(option.calendarId, !option.enabled));
			return;
		}
		if (focusArea !== "actions") return;
		if (actionIndex === 0) {
			Effect.runSync(
				updateSettings({
					weekStartDay: draftWeekStart,
					notificationsEnabled: draftNotificationsEnabled,
					notificationLeadMinutes: normalizedNotificationMinutes,
					themeId: draftTheme,
				}),
			);
			Effect.runSync(setThemeId(draftTheme));
			Effect.runSync(closeModal);
		} else {
			Effect.runSync(closeModal);
		}
	}, [
		activeSection,
		actionIndex,
		draftNotificationsEnabled,
		draftWeekStart,
		focusArea,
		normalizedNotificationMinutes,
		draftTheme,
		googleOptionIndex,
		googleOptions,
		settings.google.connected,
	]);

	useEffect(() => {
		setSettingsModalCommandHandlers({
			nextSection,
			prevSection,
			nextOption,
			prevOption,
			focusNextArea,
			focusPrevArea,
			activate,
		});
		return () => setSettingsModalCommandHandlers(null);
	}, [
		activate,
		focusNextArea,
		focusPrevArea,
		nextOption,
		nextSection,
		prevOption,
		prevSection,
	]);

	const actionLabel =
		activeSection === "sync" && focusArea === "fields" ? "Action" : "Save";
	const helpText = buildHelpText(
		["modal:settings"],
		[
			{
				commandIds: ["modal.settings.optionPrev", "modal.settings.optionNext"],
				label: "Options",
				order: ["J", "K"],
			},
			{
				commandIds: [
					"modal.settings.sectionPrev",
					"modal.settings.sectionNext",
				],
				label: "Tabs",
				order: ["H", "L"],
			},
			{
				commandIds: ["modal.settings.focusNext", "modal.settings.focusPrev"],
				label: "Actions",
				order: ["Tab", "Shift+Tab"],
			},
			{
				commandIds: ["modal.settings.activate"],
				label: actionLabel,
				order: ["Enter"],
			},
		],
	);

	return (
		<>
			<box
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					backgroundColor: ui.backgroundDark,
					opacity: 0.6,
					zIndex: 5,
				}}
			/>
			<ModalFrame width={modalWidth} height={modalHeight} zIndex={10}>
				<box
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						marginBottom: 1,
					}}
				>
					<text fg={ui.selected}>Settings</text>
					{isDirty && <text fg={ui.warning}>Unsaved</text>}
				</box>

				{showSections && (
					<box style={{ flexDirection: "row", marginBottom: 1 }}>
						{SECTIONS.map((section, index) => {
							const isActive = section.id === activeSection;
							const fg = isActive ? ui.selected : ui.foregroundDim;
							const prefix = isActive ? ">" : " ";
							return (
								<box
									key={section.id}
									style={{
										backgroundColor: isActive ? ui.selection : undefined,
										paddingLeft: 1,
										paddingRight: 1,
										marginRight: index < SECTIONS.length - 1 ? 1 : 0,
									}}
								>
									<text fg={fg}>
										{prefix} {section.label}
									</text>
								</box>
							);
						})}
					</box>
				)}

				<box style={{ flexDirection: "column", flexGrow: 1 }}>
					{activeSection === "calendar" ? (
						<CalendarSection
							ui={ui}
							focusArea={focusArea}
							draftWeekStart={draftWeekStart}
							weekStartOptions={WEEK_START_OPTIONS}
							labelWidth={labelWidth}
							appliedWeekStartLabel={appliedWeekStartLabel}
						/>
					) : activeSection === "notifications" ? (
						<NotificationsSection
							ui={ui}
							focusArea={focusArea}
							notificationsField={notificationsField}
							draftNotificationsEnabled={draftNotificationsEnabled}
							draftNotificationMinutes={draftNotificationMinutes}
							leadLabelWidth={leadLabelWidth}
							onMinutesInput={handleNotificationMinutesInput}
						/>
					) : activeSection === "sync" ? (
						<SyncSection
							ui={ui}
							theme={theme}
							focusArea={focusArea}
							googleOptions={googleOptions}
							googleOptionIndex={googleOptionIndex}
							isConnected={settings.google.connected}
							status={googleState.status}
							lastSyncAt={googleState.lastSyncAt}
							error={googleState.error}
							labelWidth={labelWidth}
						/>
					) : (
						<ThemesSection
							ui={ui}
							focusArea={focusArea}
							draftTheme={draftTheme}
							themeOptions={themeOptions}
						/>
					)}
				</box>

				<box
					style={{
						flexDirection: isNarrow ? "column" : "row",
						marginTop: 1,
					}}
				>
					<box
						style={{
							backgroundColor:
								focusArea === "actions" && actionIndex === 0
									? ui.selection
									: undefined,
							paddingLeft: 2,
							paddingRight: 2,
							marginRight: isNarrow ? 0 : 2,
							marginBottom: isNarrow ? 1 : 0,
							width: isNarrow ? "100%" : undefined,
						}}
					>
						<text
							fg={
								focusArea === "actions" && actionIndex === 0
									? ui.selected
									: ui.foreground
							}
						>
							Save
						</text>
					</box>
					<box
						style={{
							backgroundColor:
								focusArea === "actions" && actionIndex === 1
									? ui.selection
									: undefined,
							paddingLeft: 2,
							paddingRight: 2,
							width: isNarrow ? "100%" : undefined,
						}}
					>
						<text
							fg={
								focusArea === "actions" && actionIndex === 1
									? ui.selected
									: ui.foregroundDim
							}
						>
							Cancel
						</text>
					</box>
				</box>

				{helpText && (
					<box style={{ marginTop: 1 }}>
						<text fg={ui.foregroundDim}>{helpText}</text>
					</box>
				)}
			</ModalFrame>
		</>
	);
}

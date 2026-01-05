import { useModalDimensions } from "@hooks/useModalDimensions";
import { THEME } from "@lib/colors";
import {
	getShortMonthName,
	isValidDate,
	parseMonthAbbrev,
} from "@lib/dateUtils";
import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { ModalFrame } from "./ModalFrame";

interface GoToDateModalProps {
	currentDate: Date;
	onClose: () => void;
	onGo: (date: Date) => void;
}

type FocusedField = "day" | "month" | "year";

export function GoToDateModal({
	currentDate,
	onClose,
	onGo,
}: GoToDateModalProps) {
	const { width: modalWidth, height: modalHeight } = useModalDimensions({
		minWidth: 30,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 10,
		heightPercent: 0.4,
		maxHeightPercent: 0.6,
	});
	const [dayValue, setDayValue] = useState(String(currentDate.getDate()));
	const [monthValue, setMonthValue] = useState(
		getShortMonthName(currentDate.getMonth()),
	);
	const [yearValue, setYearValue] = useState(String(currentDate.getFullYear()));
	const [focusedField, setFocusedField] = useState<FocusedField>("day");
	const [error, setError] = useState<string | null>(null);

	useKeyboard((key) => {
		if (key.name === "escape") {
			onClose();
			return;
		}

		if (key.name === "tab") {
			key.preventDefault();
			if (key.shift) {
				// Shift+Tab: go backwards
				setFocusedField((prev) => {
					if (prev === "day") return "year";
					if (prev === "month") return "day";
					return "month";
				});
			} else {
				// Tab: go forward
				setFocusedField((prev) => {
					if (prev === "day") return "month";
					if (prev === "month") return "year";
					return "day";
				});
			}
		}
	});

	const handleSubmit = () => {
		setError(null);

		// Parse day
		const day = parseInt(dayValue, 10);
		if (Number.isNaN(day) || day < 1 || day > 31) {
			setError("Invalid day (1-31)");
			return;
		}

		// Parse month
		const month = parseMonthAbbrev(monthValue);
		if (month === null) {
			setError("Invalid month (jan-dec)");
			return;
		}

		// Parse year
		let year = currentDate.getFullYear();
		if (yearValue.trim()) {
			year = parseInt(yearValue, 10);
			if (Number.isNaN(year) || year < 1900 || year > 2100) {
				setError("Invalid year (1900-2100)");
				return;
			}
		}

		// Validate the complete date
		if (!isValidDate(year, month, day)) {
			setError(`Invalid date: ${monthValue} ${day} doesn't exist`);
			return;
		}

		onGo(new Date(year, month, day));
	};

	return (
		<ModalFrame width={modalWidth} height={modalHeight}>
			{/* Title */}
			<text fg={THEME.selected} style={{ marginBottom: 1 }}>
				Go To Date
			</text>

			{/* Input Fields */}
			<box style={{ flexDirection: "row", gap: 1, marginBottom: 1 }}>
				{/* Day */}
				<box style={{ flexDirection: "column" }}>
					<text fg={THEME.foregroundDim}>Day</text>
					<box
						style={{
							border: true,
							borderColor:
								focusedField === "day" ? THEME.selected : THEME.border,
							width: 6,
							height: 3,
						}}
					>
						<input
							value={dayValue}
							focused={focusedField === "day"}
							onInput={setDayValue}
							onSubmit={handleSubmit}
						/>
					</box>
				</box>

				{/* Month */}
				<box style={{ flexDirection: "column" }}>
					<text fg={THEME.foregroundDim}>Month</text>
					<box
						style={{
							border: true,
							borderColor:
								focusedField === "month" ? THEME.selected : THEME.border,
							width: 8,
							height: 3,
						}}
					>
						<input
							value={monthValue}
							focused={focusedField === "month"}
							onInput={setMonthValue}
							onSubmit={handleSubmit}
						/>
					</box>
				</box>

				{/* Year */}
				<box style={{ flexDirection: "column" }}>
					<text fg={THEME.foregroundDim}>Year</text>
					<box
						style={{
							border: true,
							borderColor:
								focusedField === "year" ? THEME.selected : THEME.border,
							width: 8,
							height: 3,
						}}
					>
						<input
							value={yearValue}
							focused={focusedField === "year"}
							onInput={setYearValue}
							onSubmit={handleSubmit}
						/>
					</box>
				</box>
			</box>

			{/* Error */}
			{error && (
				<text fg={THEME.error} style={{ marginBottom: 1 }}>
					{error}
				</text>
			)}

			{/* Help */}
			<text fg={THEME.foregroundDim}>
				Tab to switch fields | Enter to go | Esc to cancel
			</text>
		</ModalFrame>
	);
}

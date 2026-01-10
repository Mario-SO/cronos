import { useToasts } from "@features/overlays/toastState";
import { useTheme } from "@features/theme/themeState";

export function ToastHost() {
	const toasts = useToasts();
	const theme = useTheme();
	const ui = theme.ui;

	if (toasts.length === 0) {
		return null;
	}

	return (
		<box
			style={{
				position: "absolute",
				bottom: 1,
				right: 1,
				zIndex: 20,
				flexDirection: "column",
				alignItems: "flex-end",
			}}
		>
			{toasts.map((toast, index) => {
				const borderColor = toast.tone === "error" ? ui.error : ui.border;
				const textColor = toast.tone === "error" ? ui.error : ui.foreground;
				return (
					<box
						key={toast.id}
						style={{
							border: true,
							borderColor,
							backgroundColor: ui.backgroundDark,
							paddingLeft: 1,
							paddingRight: 1,
							marginBottom: index < toasts.length - 1 ? 1 : 0,
						}}
					>
						<text fg={textColor}>{toast.message}</text>
					</box>
				);
			})}
		</box>
	);
}

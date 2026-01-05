import { THEME } from "@lib/colors";
import type { PropsWithChildren } from "react";

interface ModalFrameProps extends PropsWithChildren {
	width: number;
	height: number;
}

export function ModalFrame({ width, height, children }: ModalFrameProps) {
	return (
		<box
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				width,
				height,
				marginTop: -Math.floor(height / 2),
				marginLeft: -Math.floor(width / 2),
				backgroundColor: THEME.background,
				border: true,
				borderStyle: "double",
				borderColor: THEME.borderHighlight,
				flexDirection: "column",
				padding: 1,
			}}
		>
			{children}
		</box>
	);
}

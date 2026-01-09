import { useTerminalSize } from "@shared/hooks/useTerminalSize";

interface ModalDimensionsOptions {
	minWidth: number;
	widthPercent: number;
	maxWidthPercent: number;
	minHeight: number;
	heightPercent: number;
	maxHeightPercent: number;
}

export function useModalDimensions(options: ModalDimensionsOptions): {
	width: number;
	height: number;
} {
	const terminalSize = useTerminalSize();
	const width = Math.min(
		Math.floor(terminalSize.width * options.maxWidthPercent),
		Math.max(
			options.minWidth,
			Math.floor(terminalSize.width * options.widthPercent),
		),
	);
	const height = Math.min(
		Math.floor(terminalSize.height * options.maxHeightPercent),
		Math.max(
			options.minHeight,
			Math.floor(terminalSize.height * options.heightPercent),
		),
	);

	return { width, height };
}

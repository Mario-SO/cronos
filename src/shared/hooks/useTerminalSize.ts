import { useEffect, useState } from "react";

interface TerminalSize {
	width: number;
	height: number;
}

/**
 * Hook to get and track terminal window dimensions.
 * Updates automatically when the terminal is resized.
 */
export function useTerminalSize(): TerminalSize {
	const [size, setSize] = useState<TerminalSize>(() => {
		// Get initial size from process.stdout
		if (typeof process !== "undefined" && process.stdout) {
			return {
				width: process.stdout.columns || 80,
				height: process.stdout.rows || 24,
			};
		}
		return { width: 80, height: 24 };
	});

	useEffect(() => {
		const updateSize = () => {
			if (typeof process !== "undefined" && process.stdout) {
				setSize({
					width: process.stdout.columns || 80,
					height: process.stdout.rows || 24,
				});
			}
		};

		// Update on resize
		if (typeof process !== "undefined" && process.stdout) {
			process.stdout.on("resize", updateSize);
		}

		// Initial update
		updateSize();

		return () => {
			if (typeof process !== "undefined" && process.stdout) {
				process.stdout.off("resize", updateSize);
			}
		};
	}, []);

	return size;
}

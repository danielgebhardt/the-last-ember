import type { SVGProps } from "react";

// Snapping chest mimic with toothed lid and jagged maw.
const TreasureMimicIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.65"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M4 11 4 5l15-2 2 6" />
		<path d="M4 12h17v8H4Z" />
		<path d="M6 11l2 3 2-3 2 3 2-3 2 3 2-3" />
		<path d="M8 17l2-2 2 2 2-2 2 2" />
		<path d="M8 6h7" />
	</svg>
);

export default TreasureMimicIcon;

import type { SVGProps } from "react";

// Finger ring with a slightly displaced gemstone and blink-like accent.
const RingOfDisplacementIcon = (props: SVGProps<SVGSVGElement>) => (
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
		{/* Gem setting */}
		<path d="M12 4 14.3 6 12 8 9.7 6Z" />

		{/* Ring shoulders */}
		<path d="M9.8 7.4 7.7 10M14.2 7.4 16.3 10" />

		{/* Ring band */}
		<circle cx="12" cy="14" r="4.2" />

		{/* Inner opening */}
		<circle cx="12" cy="14" r="1.9" />

		{/* Displacement accent */}
		<path d="M17.3 6.8l1.2-1.2M18.2 9h1.6" />
	</svg>
);

export default RingOfDisplacementIcon;

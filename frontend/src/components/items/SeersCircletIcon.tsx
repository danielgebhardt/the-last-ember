import type { SVGProps } from "react";

// Elegant circlet with central seeing gem / eye motif.
const SeersCircletIcon = (props: SVGProps<SVGSVGElement>) => (
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
		{/* Circlet band */}
		<path d="M4 14c2.5-3 5-4.5 8-4.5s5.5 1.5 8 4.5" />

		{/* Side supports */}
		<path d="M7 13l1.5 3M17 13l-1.5 3" />

		{/* Central gem frame */}
		<path d="M12 7.2 14.2 9 12 10.8 9.8 9Z" />

		{/* Inner seer gem */}
		<circle cx="12" cy="9" r="0.8" />

		{/* Subtle sight lines */}
		<path d="M9 12h6" />
	</svg>
);

export default SeersCircletIcon;

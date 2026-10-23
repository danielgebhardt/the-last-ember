import type { SVGProps } from "react";

// Angled cursed sword with a clear blade silhouette and a blood accent.
const HungeringBladeIcon = (props: SVGProps<SVGSVGElement>) => (
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
		{/* Main blade */}
		<path d="M6.8 18.1 16.1 4 19.7 7.6 9.4 21Z" />

		{/* Grip */}
		<path d="M5.8 16.9 11.2 22.3" />

		{/* Guard / hilt flare */}
		<path d="M8.4 19.5 4.8 20.8 6.1 17.2Z" />

		{/* Crossguard accent */}
		<path d="M9.8 15.5l5.2 5.2" />

		{/* Pommel */}
		<circle cx="4.5" cy="22.3" r="1.1" />

		{/* Blood accent */}
		<path d="M15 7.1q1.1 1.2.1 2.6" />
	</svg>
);

export default HungeringBladeIcon;

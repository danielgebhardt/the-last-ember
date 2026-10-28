import type { SVGProps } from "react";

const IronJuggernautIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Armored body */}
		<path d="M6 20V9l3-3h6l3 3v11Z" />

		{/* Helmet */}
		<path d="M8 7V4l4-2 4 2v3" />

		{/* Visor */}
		<path d="M9 11h2m2 0h2" />

		{/* Chest plate */}
		<path d="M9 15h6" />

		{/* Shoulder armor */}
		<path d="M4 13l2-3m12 0 2 3" />

		{/* Lower armor */}
		<path d="M4 20h16" />

		{/* Massive shield */}
		<path d="M2 11l5 1v8l-2 2-3-2Z" />

		{/* Upper weapon detail */}
		<path d="M20 8l2-3" />
	</svg>
);

export default IronJuggernautIcon;

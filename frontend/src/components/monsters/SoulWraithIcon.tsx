import type { SVGProps } from "react";

// Floating spectral body carrying a harvesting scythe.
const SoulWraithIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M13 3q5 2 5 8l-2 8-4-3-5 4 1-9q0-6 5-8Z" />
		<path d="M10 10h2m2 0h2" />
		<path d="M3 5q8-4 17 2l-3 4" />
		<path d="M5 5l-2 15" />
		<circle cx="11" cy="10.8" r="0.4" fill="currentColor" stroke="none" />
		<circle cx="15" cy="10.8" r="0.4" fill="currentColor" stroke="none" />
	</svg>
);
export default SoulWraithIcon;

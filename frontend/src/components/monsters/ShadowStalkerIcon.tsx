import type { SVGProps } from "react";

// Smoke-like body with slanted eyes and a flat mouth.
const ShadowStalkerIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 3q7 1 7 8 0 5-4 7l2 4-5-2-4 2-4-2-5 2 2-5Q5 4 12 3Z" />
		<path d="M8 11l3 1m5-1-3 1" />
		<path d="M9 16h6" />
		<circle cx="9.3" cy="10.9" r="0.4" fill="currentColor" stroke="none" />
		<circle cx="14.7" cy="10.9" r="0.4" fill="currentColor" stroke="none" />
	</svg>
);
export default ShadowStalkerIcon;

import type { SVGProps } from "react";

// Central spiderweb with strong radial symmetry for instant recognition at small size.
const WebIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<circle cx="12" cy="12" r="1" />
		<path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
		<path d="M8 8a6 6 0 0 1 8 0" />
		<path d="M6 12a8 8 0 0 1 12 0" />
		<path d="M8 16a6 6 0 0 0 8 0" />
	</svg>
);

export default WebIcon;
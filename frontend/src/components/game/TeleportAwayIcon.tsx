import type { SVGProps } from "react";

const TeleportAwayIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M9 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
		<path d="M6 13h6l2 6H8Z" />
		<path d="M16 8h4M17 12h5M18 16h4" />
		<path d="M18 6l3 2-3 2" />
	</svg>
);

export default TeleportAwayIcon;

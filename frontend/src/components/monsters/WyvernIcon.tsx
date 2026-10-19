import type { SVGProps } from "react";

// Spread wings, horned head, and barbed tail for a clearer draconic profile.
const WyvernIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M9 8 3 4 2 13l7-2" />
		<path d="M15 8l6-4 1 9-7-2" />
		<path d="M10 8 12 3l2 5-1 5-1 2-1-2Z" />
		<path d="M11 9h.1M13 9h.1" />
		<path d="M12 15v4l-3 2" />
		<path d="M12 19l4 2" />
		<path d="M12 17c2 0 3 1 4 3" />
	</svg>
);

export default WyvernIcon;
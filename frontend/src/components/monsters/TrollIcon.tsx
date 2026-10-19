import type { SVGProps } from "react";

// Shaggy crown, long nose, and hanging jaw help the troll read as lankier and uglier than the ogre.
const TrollIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="m6 7-3-3 1 8 3 2m11-7 3-3-1 8-3 2" />
		<path d="M7 7 8 3l4 2 4-2 1 4v10l-5 5-5-5Z" />
		<path d="M9 10h.1M15 10h.1" />
		<path d="M12 10v5" />
		<path d="M10 16h4" />
		<path d="m10 16 1 3m2-3-1 3" />
		<path d="M8 6h8" />
	</svg>
);

export default TrollIcon;
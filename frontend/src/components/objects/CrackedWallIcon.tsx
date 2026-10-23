import type { SVGProps } from "react";

// Placeholder until the developer-supplied artwork: masonry split by a jagged crack.
const CrackedWallIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M3 4h18v16H3z" />
		<path d="M3 9h7M14 9h7M3 15h5M12 15h9M8 4v5M16 9v6M6 15v5" />
		<path d="M12 3l-2 5 3 3-2 4 2 3-1 3" />
	</svg>
);

export default CrackedWallIcon;

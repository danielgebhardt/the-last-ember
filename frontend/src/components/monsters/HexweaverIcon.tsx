import type { SVGProps } from "react";

// Hexagonal mask with a sly grin, hanging from puppet strings above and below.
const HexweaverIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 3 6 7v8l6 6 6-6V7Z" />
		<path d="M9 10h.1M15 10h.1" />
		<path d="M10 14q2 2 4 0" />
		<path d="M8 1v4m4-5v5m4-4v4" />
		<path d="M8 18v3m4-2v3m4-3v3" />
	</svg>
);
export default HexweaverIcon;

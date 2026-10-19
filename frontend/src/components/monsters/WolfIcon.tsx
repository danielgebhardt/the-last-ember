import type { SVGProps } from "react";

const WolfIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M3 3 9 7h6l6-4-2 10 3 4-10 5L2 17l3-4L3 3Z" />
		<path d="M7 12l3 1m7-1-3 1M10 17l2 2 2-2M4 18l-2 3m18-3 2 3" />
	</svg>
);

export default WolfIcon;

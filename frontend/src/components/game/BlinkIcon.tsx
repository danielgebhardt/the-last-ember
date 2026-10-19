import type { SVGProps } from "react";

const BlinkIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M13 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
		<path d="M10 10h6l3 8h-5l-2 4-2-4H6Z" />
		<path d="M4 4h2M2 9h3M1 15h3M4 20h2" />
		<path d="M19 3l2-2m-2 8 3 1" />
	</svg>
);

export default BlinkIcon;

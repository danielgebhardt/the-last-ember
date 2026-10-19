import type { SVGProps } from "react";

const GoblinArcherIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M5 8 1 6l3 7m9-5 3-2-1 7" />
		<path d="M5 8q4-4 8 0v7q-4 7-8 0V8Z" />
		<path d="M7 11l2 1m2-1-2 1M7 16l2 2 2-2" />
		<path d="M18 3q8 9 0 18M18 3v18M15 12h8" />
	</svg>
);

export default GoblinArcherIcon;

import type { SVGProps } from "react";

const EmberBoltIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M20 12c0 2.5-2 4.5-4.5 4.5S11 14.5 11 12s2-4.5 4.5-4.5S20 9.5 20 12Z" />
		<path d="M4 12h8" />
		<path d="M2 10l4 2-4 2" />
		<path d="M5 8l3 2M5 16l3-2" />
		<path d="M9 9l2 1M9 15l2-1" />
	</svg>
);

export default EmberBoltIcon;

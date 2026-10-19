import type { SVGProps } from "react";

const StoneLanceIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M3 20 10 13" />
		<path d="M10 13 18 4l3 1-2 3-8 8Z" />
		<path d="M8 12l3 .5 1 2.5" />
		<path d="M5 18l1 1M6 16l1 1" />
	</svg>
);

export default StoneLanceIcon;

import type { SVGProps } from "react";

const ShockIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M14 1 5 13h7l-2 10 10-14h-7l1-8Z" />
		<path d="M4 4 2 7m18 10 2 3" />
	</svg>
);

export default ShockIcon;

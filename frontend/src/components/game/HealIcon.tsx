import type { SVGProps } from "react";

const HealIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
		<path d="M5 4 3 6m16-2 2 2M3 18l2 2m14 0 2-2" />
	</svg>
);

export default HealIcon;

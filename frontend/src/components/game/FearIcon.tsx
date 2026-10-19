import type { SVGProps } from "react";

const FearIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" />
		<path d="M7 10l4 3m6-3-4 3M9 17l3-2 3 2M3 3l2 2m16-2-2 2" />
	</svg>
);

export default FearIcon;

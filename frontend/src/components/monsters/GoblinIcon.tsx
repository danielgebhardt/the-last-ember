import type { SVGProps } from "react";

const GoblinIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M7 9 1 5l3 8 3 1m10-5 6-4-3 8-3 1" />
		<path d="M7 7q5-4 10 0v9q-5 10-10 0V7Z" />
		<path d="M8 11l3 1m5-1-3 1M9 17l2 3 1-3 1 3 2-3" />
	</svg>
);

export default GoblinIcon;

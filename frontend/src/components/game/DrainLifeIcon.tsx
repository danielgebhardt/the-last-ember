import type { SVGProps } from "react";

const DrainLifeIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 20q-7-4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5-7 9-7 9Z" />
		<path d="M18 6c-1 6-4 9-10 10" />
		<path d="M7 14l1 2 2-1" />
	</svg>
);

export default DrainLifeIcon;

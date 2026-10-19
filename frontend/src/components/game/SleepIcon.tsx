import type { SVGProps } from "react";

const SleepIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M17 2A10 10 0 1 0 22 18 9 9 0 0 1 17 2Z" />
		<path d="M5 5v4m-2-2h4M18 5v4m-2-2h4" />
	</svg>
);

export default SleepIcon;

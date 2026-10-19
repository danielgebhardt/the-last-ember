import type { SVGProps } from "react";

const SonicSpearIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M2 12h15l5-3v6l-5-3" />
		<path d="M5 7q5 5 0 10M9 4q9 8 0 16M13 2q12 10 0 20" />
	</svg>
);

export default SonicSpearIcon;

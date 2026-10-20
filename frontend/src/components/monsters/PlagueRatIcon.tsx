import type { SVGProps } from "react";

// Hunched body with a pointed snout, a damaged ear, torn necrotic hide and a curled tail.
const PlagueRatIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M4 16Q5 9 11 9Q15 9 18 12L21 13L22 15L19 16Q16 19 8 19H6Z" />
		<path d="M15 10Q16 6 19 9L19 12" />
		<path d="M8 11l2 2-2 2 3 2" />
		<path d="M13 12l-1 3 3 1" />
		<path d="M5 18Q2 18 2 21Q4 23 6 21" />
		<path d="M9 19v2M16 19v2" />
		<circle cx="18.3" cy="13.1" r=".7" fill="currentColor" stroke="none" />
	</svg>
);
export default PlagueRatIcon;

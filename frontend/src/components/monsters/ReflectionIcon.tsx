import type { SVGProps } from "react";

// A dashed, mirrored adventurer outline holding a sword in the off hand.
const ReflectionIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<circle cx="12" cy="5.5" r="2.5" strokeDasharray="2 1.5" />
		<path d="M12 8v7m0 0-3 6m3-6 3 6M8 11h8" strokeDasharray="2.5 1.5" />
		<path d="M8 11 5 4m-1.5 2L7 4.5" />
	</svg>
);
export default ReflectionIcon;

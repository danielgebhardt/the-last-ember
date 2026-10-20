import type { SVGProps } from "react";

// Swollen body around a glowing mana reservoir, six grasping legs and a feeler.
const ManaLeechIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 6c3 0 5 2 5 5s-2 7-5 7-5-4-5-7 2-5 5-5Z" />
		<circle cx="12" cy="11" r="2" />
		<path d="M7 9 4 7M17 9l3-2" />
		<path d="M6 13H3M18 13h3" />
		<path d="M8 17l-3 2M16 17l3 2" />
		<path d="M12 4V2" />
	</svg>
);
export default ManaLeechIcon;

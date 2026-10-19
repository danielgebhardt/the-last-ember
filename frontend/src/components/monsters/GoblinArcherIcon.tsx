import type { SVGProps } from "react";

// Goblin face plus a clearer side bow so it reads as a creature first, ranged attacker second.
const GoblinArcherIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<g transform="translate(-0.25 1) scale(0.8)">
			<path d="M7 8 2 5l2 7 3 1M17 8l5-3-2 7-3 1" />
			<path d="M7 7q5-4 10 0v8q0 6-5 6t-5-6Z" />
			<path d="M9 10h.1M15 10h.1" />
			<path d="M10 13q2-2 4 0" />
			<path d="M9 16h6" />
			<path d="m10 16 1 3 1-3m1 0 1 3 1-3" />
		</g>
		<path d="M18.5 4q4 4 0 16" />
		<path d="M15.5 12h6" />
		<path d="m19 10 2 2-2 2" />
	</svg>
);

export default GoblinArcherIcon;
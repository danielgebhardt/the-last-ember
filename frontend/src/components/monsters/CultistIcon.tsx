import type { SVGProps } from "react";

// Hooded silhouette with a ritual eye sigil to separate the cultist from the necromancer.
const CultistIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="m12 3-6 7-3 11h18l-3-11Z" />
		<path d="M9 10q3-3 6 0" />
		<path d="M9 11h6l-1 5h-4Z" />
		<path d="M12 13c1.2 0 2 .5 2.5 1-.5.5-1.3 1-2.5 1s-2-.5-2.5-1c.5-.5 1.3-1 2.5-1Z" />
		<path d="M12 14h.1" />
		<path d="M7 20h10" />
	</svg>
);

export default CultistIcon;
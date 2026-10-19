import type { SVGProps } from "react";

// Hooded caster with skull mask and raised staff motif for a more explicit necromancer.
const NecromancerIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="m12 2-6 8-3 11h18l-3-11Z" />
		<path d="M9 11h6v5l-2 2h-2l-2-2Z" />
		<path d="M10 13h.1M14 13h.1" />
		<path d="M10 16h4" />
		<path d="M18 6V3m0 3-2 2m2-2 2 2" />
		<path d="M17 9h2" />
	</svg>
);

export default NecromancerIcon;
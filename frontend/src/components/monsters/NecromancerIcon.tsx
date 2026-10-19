import type { SVGProps } from "react";

const NecromancerIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 1 4 11 2 22h20l-2-11L12 1Z" />
		<path d="M7 12h10v7l-5 3-5-3v-7Z" />
		<path d="M8 14h3v3H8zm5 0h3v3h-3zM10 19h4M12 5v4" />
	</svg>
);

export default NecromancerIcon;

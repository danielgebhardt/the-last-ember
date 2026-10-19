import type { SVGProps } from "react";

const FrostBoltIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
		<path d="M9 3l3 3 3-3M9 21l3-3 3 3" />
	</svg>
);

export default FrostBoltIcon;

import type { SVGProps } from "react";

const FrostNovaIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 7v10M7 12h10M8.5 8.5l7 7m0-7-7 7" />
		<path d="M12 2a10 10 0 0 1 10 10M12 22A10 10 0 0 1 2 12M2 9V6h3M22 15v3h-3" />
	</svg>
);

export default FrostNovaIcon;

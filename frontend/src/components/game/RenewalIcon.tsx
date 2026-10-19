import type { SVGProps } from "react";

const RenewalIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 22V9" />
		<path d="M12 14C4 15 3 9 4 5c7 0 8 4 8 9Z" />
		<path d="M12 12C12 6 16 3 21 3c1 6-2 9-9 9Z" />
		<path d="M8 19l4 2 4-2" />
	</svg>
);

export default RenewalIcon;

import type { SVGProps } from "react";

const TrollIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M7 7 3 3l1 9 3 2m10-8 4-4-1 9-3 2" />
		<path d="M8 5l4-3 4 3 2 11-6 6-6-6L8 5Z" />
		<path d="M8 11l3 1m5-1-3 1M12 12l-2 4h4M9 18h6" />
	</svg>
);

export default TrollIcon;

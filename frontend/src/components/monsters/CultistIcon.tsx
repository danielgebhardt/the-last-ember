import type { SVGProps } from "react";

const CultistIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 1 5 8 2 22h20L19 8l-7-7Z" />
		<path d="M7 12h10l-2 7H9l-2-7Z" />
		<path d="M9 14h2m2 0h2M12 6v4M5 22l3-3m11 3-3-3" />
	</svg>
);

export default CultistIcon;

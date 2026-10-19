import type { SVGProps } from "react";

const PoisonDartIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M2 20 17 5m-2-3 7 0v7l-7-7Z" />
		<path d="M6 16l3 3M9 13l3 3M15 14q2 3 0 5t-4 0q-1-2 4-5Z" />
	</svg>
);

export default PoisonDartIcon;

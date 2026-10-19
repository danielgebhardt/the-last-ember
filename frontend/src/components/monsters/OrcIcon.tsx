import type { SVGProps } from "react";

const OrcIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M4 8 2 3l6 3h8l6-3-2 5v8l-8 6-8-6V8Z" />
		<path d="M7 11l4 2m6-2-4 2M8 17l2 5 2-4 2 4 2-5M9 7h6" />
	</svg>
);

export default OrcIcon;

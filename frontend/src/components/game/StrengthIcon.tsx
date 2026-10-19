import type { SVGProps } from "react";

const StrengthIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M5 12V8a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v2a2 2 0 0 1 3 2v5l-5 6H9l-4-6Z" />
		<path d="M5 12h9l-3 3" />
		<path d="M3 4l2-2m15 2 2-2" />
	</svg>
);

export default StrengthIcon;

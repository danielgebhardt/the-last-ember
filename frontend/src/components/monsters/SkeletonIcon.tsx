import type { SVGProps } from "react";

const SkeletonIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M6 5q0-4 6-4t6 4v9l-3 2v5H9v-5l-3-2V5Z" />
		<path d="M8 8h3v3H8zm5 0h3v3h-3z" />
		<path d="M12 12l-2 3h4l-2-3M9 18h6M11 18v3m2-3v3" />
	</svg>
);

export default SkeletonIcon;

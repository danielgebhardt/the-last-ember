import type { SVGProps } from "react";

const WyvernIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M11 7 3 2 1 15l8-5m4-3 8-5 2 13-8-5" />
		<path d="M10 8l2-7 3 7-1 7-2 3-2-3V8Z" />
		<path d="M12 18v4l-3 1m3-1 3 1M10 10h1m3 0h1" />
	</svg>
);

export default WyvernIcon;

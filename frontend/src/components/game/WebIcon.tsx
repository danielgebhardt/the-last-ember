import type { SVGProps } from "react";

const WebIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 1v22M1 12h22M4 4l16 16M20 4 4 20" />
		<path d="M12 5q8 0 7 7-1 7-7 7-7 0-7-7 0-7 7-7Z" />
	</svg>
);

export default WebIcon;

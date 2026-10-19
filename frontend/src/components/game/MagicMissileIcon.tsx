import type { SVGProps } from "react";

const MagicMissileIcon = (props: SVGProps<SVGSVGElement>) => (
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
		{/* top short missile */}
		<path d="M5 7h6" />
		<path d="m11 5 2 2-2 2-2-2" />

		{/* middle long missile */}
		<path d="M2 12h15" />
		<path d="m17 10 2 2-2 2-2-2" />

		{/* bottom short-medium missile */}
		<path d="M6 17h5" />
		<path d="m11 15 2 2-2 2-2-2" />
	</svg>
);

export default MagicMissileIcon;

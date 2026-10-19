import type { SVGProps } from "react";

const WraithIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 2q-8 0-8 10v10l4-4 4 4 4-4 4 4V12q0-10-8-10Z" />
		<path d="M7 11l3 2m7-2-3 2M9 17q3-3 6 0M12 2v4" />
	</svg>
);

export default WraithIcon;

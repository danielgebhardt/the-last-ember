import type { SVGProps } from "react";

const ProtectionIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 2 3 6v7q0 6 9 9 9-3 9-9V6l-9-4Z" />
		<path d="M12 6v12M7 12h10" />
	</svg>
);

export default ProtectionIcon;

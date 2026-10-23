import type { SVGProps } from "react";

const GoldboundBladeIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="currentColor"
		stroke="currentColor"
		strokeWidth="0.35"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		{/* Long upright blade */}
		<path d="M12 1 10.7 4.5v11.5h2.6V4.5Z" />

		{/* Straight crossguard */}
		<path d="M6 16h12" />

		{/* Narrow grip */}
		<path d="M11.3 16v4.5h1.4V16" />

		{/* Rounded crossguard ends */}
		<circle cx="6" cy="16" r="0.8" />
		<circle cx="18" cy="16" r="0.8" />

		{/* Coin pommel */}
		<circle cx="12" cy="22" r="1.6" />

		{/* Pommel engraving */}
		<path
			d="M11.3 22h1.4"
			fill="none"
			stroke="var(--goldbound-cutout, #11151b)"
			strokeWidth="0.7"
		/>
	</svg>
);

export default GoldboundBladeIcon;

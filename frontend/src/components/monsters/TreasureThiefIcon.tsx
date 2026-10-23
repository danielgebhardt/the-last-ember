import type { SVGProps } from "react";

// Sneaky bag-snatcher silhouette clutching stolen loot and running away.
const TreasureThiefIcon = (props: SVGProps<SVGSVGElement>) => (
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
		{/* Hood / head */}
		<path d="M8 6c0-1.7 1.4-3 3-3s3 1.3 3 3c0 1.4-1 2.6-2.3 2.9L10 9C8.8 8.6 8 7.4 8 6Z" />

		{/* Body / sneaking pose */}
		<path d="M6 13 9 10l3 2 2 1 2 4-3 1-2-2-3 1-2-4Z" />

		{/* Loot sack */}
		<path d="M15 8h3l2 2-1 4-4 1-2-2 1-4Z" />
		<path d="M16 10h3" />
		<circle cx="17.5" cy="12.3" r=".45" fill="currentColor" stroke="none" />

		{/* Face / eye */}
		<path d="M9.2 6.1h.1" />

		{/* Arms / motion */}
		<path d="M4 10l2 1M12 7l2-2" />

		{/* Legs / running away */}
		<path d="M5 18l3-2M10 18l2 3M12 17l3 2" />

		{/* Flee motion */}
		<path d="M4 15l-2 1m19-2 2 1" />
	</svg>
);

export default TreasureThiefIcon;

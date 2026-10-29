import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Recoloured to the walls' own brick, mortar and shadow.

export const CrackedWallLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<rect
			x="2"
			y="2"
			width="44"
			height="44"
			fill="#53636f"
			stroke="#394651"
			strokeWidth="2"
		/>
		<path
			d="M2 16H46M2 32H46M25 2V16M15 16V32M34 32V46"
			fill="none"
			stroke="#394651"
			strokeWidth="2"
		/>
		<path
			d="M24 3 29 15 22 23 30 32 23 45"
			fill="none"
			stroke="#1f2933"
			strokeWidth="4"
		/>
		<path
			d="M21 24 12 28M25 19 35 15M22 35 12 39"
			fill="none"
			stroke="#1f2933"
			strokeWidth="2"
		/>
	</svg>
);

export const CrackedWallDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<rect
			x="2"
			y="2"
			width="44"
			height="44"
			fill="#74818e"
			stroke="#202a34"
			strokeWidth="2"
		/>
		<path
			d="M2 16H46M2 32H46M25 2V16M15 16V32M34 32V46"
			fill="none"
			stroke="#202a34"
			strokeWidth="2"
		/>
		<path
			d="M24 3 29 15 22 23 30 32 23 45"
			fill="none"
			stroke="#151d28"
			strokeWidth="4"
		/>
		<path
			d="M21 24 12 28M25 19 35 15M22 35 12 39"
			fill="none"
			stroke="#151d28"
			strokeWidth="2"
		/>
	</svg>
);

import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const GiantRatLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M6 30Q8 19 23 19L29 14 35 16 44 24 39 31 26 32 20 39H11Z"
			fill="#ab5a2d"
			stroke="#7b8a95"
			strokeWidth="2"
		/>
		<path d="M11 34Q-2 28 6 11Q11 5 17 12" stroke="#ab5a2d" strokeWidth="3.5" />
		<circle
			cx="30"
			cy="16"
			r="5"
			fill="#7b8a95"
			stroke="#ab5a2d"
			strokeWidth="2"
		/>
		<circle cx="35" cy="24" r="2" fill="#f1f0eb" />
		<circle cx="44" cy="25" r="2" fill="#b17c2d" />
		<path d="M15 38 13 43M29 32 32 42" stroke="#ab5a2d" strokeWidth="3" />
		<path d="M22 17 26 13M39 30 45 32" stroke="#b17c2d" strokeWidth="2" />
	</svg>
);

export const GiantRatDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M6 30Q8 19 23 19L29 14 35 16 44 24 39 31 26 32 20 39H11Z"
			fill="#ef995b"
			stroke="#58677a"
			strokeWidth="2"
		/>
		<path d="M11 34Q-2 28 6 11Q11 5 17 12" stroke="#ef995b" strokeWidth="3.5" />
		<circle
			cx="30"
			cy="16"
			r="5"
			fill="#58677a"
			stroke="#ef995b"
			strokeWidth="2"
		/>
		<circle cx="35" cy="24" r="2" fill="#16202b" />
		<circle cx="44" cy="25" r="2" fill="#f4c16c" />
		<path d="M15 38 13 43M29 32 32 42" stroke="#ef995b" strokeWidth="3" />
		<path d="M22 17 26 13M39 30 45 32" stroke="#f4c16c" strokeWidth="2" />
	</svg>
);

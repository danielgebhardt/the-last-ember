import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const DungeonBruteLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M3 17 12 7 18 16 24 10 30 16 36 7 45 17 40 40H8Z"
			fill="#7c8b99"
			stroke="#a75c28"
			strokeWidth="3"
		/>
		<path
			d="M11 20 24 15 37 20 36 34 29 43H19L12 34Z"
			fill="#a75c28"
			stroke="#a75c28"
			strokeWidth="1.6"
		/>
		<path
			d="M14 23 22 26 20 30 14 28ZM34 23 26 26 28 30 34 28Z"
			fill="#f4f1eb"
		/>
		<path d="M17 35 24 32 31 35 29 41H19Z" fill="#f4f1eb" />
		<path d="M11 12 5 5M37 12 43 5" stroke="#a75c28" strokeWidth="4" />
	</svg>
);

export const DungeonBruteDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M3 17 12 7 18 16 24 10 30 16 36 7 45 17 40 40H8Z"
			fill="#58667d"
			stroke="#f4af69"
			strokeWidth="3"
		/>
		<path
			d="M11 20 24 15 37 20 36 34 29 43H19L12 34Z"
			fill="#f4af69"
			stroke="#f4af69"
			strokeWidth="1.6"
		/>
		<path
			d="M14 23 22 26 20 30 14 28ZM34 23 26 26 28 30 34 28Z"
			fill="#1c2733"
		/>
		<path d="M17 35 24 32 31 35 29 41H19Z" fill="#1c2733" />
		<path d="M11 12 5 5M37 12 43 5" stroke="#f4af69" strokeWidth="4" />
	</svg>
);

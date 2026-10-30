import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const ManaLeechLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<circle
			cx="24"
			cy="23"
			r="10"
			fill="#168486"
			stroke="#87919e"
			strokeWidth="1.5"
		/>
		<path
			d="M18 18 7 6 3 16M30 18 41 6 45 16M14 26 3 32 7 44M34 26 45 32 41 44M24 13V3M24 33V45"
			stroke="#168486"
			strokeWidth="3"
		/>
		<circle
			cx="24"
			cy="23"
			r="4.5"
			fill="#e8e9ed"
			stroke="#ad7c25"
			strokeWidth="0"
		/>
		<circle cx="24" cy="23" r="2" fill="#ad7c25" />
	</svg>
);

export const ManaLeechDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<circle
			cx="24"
			cy="23"
			r="10"
			fill="#48cfcd"
			stroke="#536278"
			strokeWidth="1.5"
		/>
		<path
			d="M18 18 7 6 3 16M30 18 41 6 45 16M14 26 3 32 7 44M34 26 45 32 41 44M24 13V3M24 33V45"
			stroke="#48cfcd"
			strokeWidth="3"
		/>
		<circle
			cx="24"
			cy="23"
			r="4.5"
			fill="#151c2a"
			stroke="#f5cb67"
			strokeWidth="0"
		/>
		<circle cx="24" cy="23" r="2" fill="#f5cb67" />
	</svg>
);

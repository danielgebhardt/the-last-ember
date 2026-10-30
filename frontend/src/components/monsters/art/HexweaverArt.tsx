import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const HexweaverLight = (props: FullColorArtProps) => (
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
			cy="17"
			r="8"
			fill="#87919e"
			stroke="#7040a8"
			strokeWidth="2.4"
		/>
		<path
			d="M24 24 10 43M24 24 38 43M14 33 5 28M34 33 43 28"
			stroke="#7040a8"
			strokeWidth="4"
		/>
		<path
			d="M17 14 24 6 31 14M19 19 24 22 29 19"
			stroke="#ad7c25"
			strokeWidth="2.4"
		/>
		<path
			d="M5 15 10 21 5 27M43 15 38 21 43 27"
			stroke="#7040a8"
			strokeWidth="2.7"
		/>
		<path
			d="M24 3 32 12 24 20 16 12Z"
			fill="#e8e9ed"
			stroke="#7040a8"
			strokeWidth="2"
		/>
		<path d="M24 7V17M20 12H28" stroke="#ad7c25" strokeWidth="1.7" />
	</svg>
);

export const HexweaverDark = (props: FullColorArtProps) => (
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
			cy="17"
			r="8"
			fill="#536278"
			stroke="#b38bea"
			strokeWidth="2.4"
		/>
		<path
			d="M24 24 10 43M24 24 38 43M14 33 5 28M34 33 43 28"
			stroke="#b38bea"
			strokeWidth="4"
		/>
		<path
			d="M17 14 24 6 31 14M19 19 24 22 29 19"
			stroke="#f5cb67"
			strokeWidth="2.4"
		/>
		<path
			d="M5 15 10 21 5 27M43 15 38 21 43 27"
			stroke="#b38bea"
			strokeWidth="2.7"
		/>
		<path
			d="M24 3 32 12 24 20 16 12Z"
			fill="#151c2a"
			stroke="#b38bea"
			strokeWidth="2"
		/>
		<path d="M24 7V17M20 12H28" stroke="#f5cb67" strokeWidth="1.7" />
	</svg>
);

import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const EmberWardenLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 11 18 18 24 14 30 18 38 11 42 24 33 29 30 43 24 38 18 43 15 29 6 24Z"
			fill="#c16d10"
			stroke="#b33e25"
			strokeWidth="2"
		/>
		<path
			d="M16 24 24 28 32 24M24 28V41"
			fill="none"
			stroke="#f5f5ef"
			strokeWidth="3.8"
		/>
		<path
			d="M24 2Q13 13 23 19Q33 14 24 2Z"
			fill="#b33e25"
			stroke="#c16d10"
			strokeWidth="1.4"
		/>
		<path
			d="M9 10 3 4 6 19M39 10 45 4 42 19"
			stroke="#c16d10"
			strokeWidth="3.5"
			fill="none"
		/>
		<path d="M20 25 24 29 28 25" fill="none" stroke="#b33e25" strokeWidth="2" />
	</svg>
);

export const EmberWardenDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 11 18 18 24 14 30 18 38 11 42 24 33 29 30 43 24 38 18 43 15 29 6 24Z"
			fill="#ffb63d"
			stroke="#df592e"
			strokeWidth="2"
		/>
		<path
			d="M16 24 24 28 32 24M24 28V41"
			fill="none"
			stroke="#101923"
			strokeWidth="3.8"
		/>
		<path
			d="M24 2Q13 13 23 19Q33 14 24 2Z"
			fill="#df592e"
			stroke="#ffb63d"
			strokeWidth="1.4"
		/>
		<path
			d="M9 10 3 4 6 19M39 10 45 4 42 19"
			stroke="#ffb63d"
			strokeWidth="3.5"
			fill="none"
		/>
		<path d="M20 25 24 29 28 25" fill="none" stroke="#df592e" strokeWidth="2" />
	</svg>
);

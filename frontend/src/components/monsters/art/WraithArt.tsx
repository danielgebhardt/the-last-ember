import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const WraithLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 12 24 3 38 12 39 33 32 43 24 38 16 43 9 33Z"
			fill="#7054a0"
			stroke="#475467"
			strokeWidth="2.3"
		/>
		<path d="M14 22H34V32H14Z" fill="#edf0f2" />
		<path d="M17 26H22M26 26H31" stroke="#b17a22" strokeWidth="3" />
		<path d="M24 34V45" stroke="#7054a0" strokeWidth="3" />
	</svg>
);

export const WraithDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 12 24 3 38 12 39 33 32 43 24 38 16 43 9 33Z"
			fill="#a897da"
			stroke="#526176"
			strokeWidth="2.3"
		/>
		<path d="M14 22H34V32H14Z" fill="#17202b" />
		<path d="M17 26H22M26 26H31" stroke="#f7d57d" strokeWidth="3" />
		<path d="M24 34V45" stroke="#a897da" strokeWidth="3" />
	</svg>
);

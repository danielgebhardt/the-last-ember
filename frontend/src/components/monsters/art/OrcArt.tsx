import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const OrcLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 21 15 9 33 9 38 21 35 41H13Z"
			fill="#4d833a"
			stroke="#475869"
			strokeWidth="2.5"
		/>
		<path d="M15 22 22 26M26 26 33 22" stroke="#f7f8f9" strokeWidth="3" />
		<path
			d="M18 34 21 29 24 35 27 29 30 34"
			stroke="#bc8236"
			strokeWidth="2.2"
		/>
		<path
			d="M5 24 17 21 19 39 5 43Z"
			fill="#475869"
			stroke="#bc8236"
			strokeWidth="2.5"
		/>
		<path d="M7 27 13 35M17 27 11 36" stroke="#bc8236" strokeWidth="2" />
	</svg>
);

export const OrcDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M10 21 15 9 33 9 38 21 35 41H13Z"
			fill="#87bb64"
			stroke="#586779"
			strokeWidth="2.5"
		/>
		<path d="M15 22 22 26M26 26 33 22" stroke="#15202a" strokeWidth="3" />
		<path
			d="M18 34 21 29 24 35 27 29 30 34"
			stroke="#edbe68"
			strokeWidth="2.2"
		/>
		<path
			d="M5 24 17 21 19 39 5 43Z"
			fill="#586779"
			stroke="#edbe68"
			strokeWidth="2.5"
		/>
		<path d="M7 27 13 35M17 27 11 36" stroke="#edbe68" strokeWidth="2" />
	</svg>
);

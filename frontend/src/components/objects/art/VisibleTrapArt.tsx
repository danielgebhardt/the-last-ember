import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const VisibleTrapLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 24 12 9 18 20 24 7 30 20 36 9 43 24 39 35 31 41H17L9 35Z"
			fill="#d22f48"
			stroke="#354754"
			strokeWidth="2.2"
		/>
		<path
			d="M12 29 19 23 24 30 29 23 36 29 32 36H16Z"
			fill="#edf0f2"
			stroke="#354754"
			strokeWidth="1.8"
		/>
		<path d="M9 37H39" stroke="#901b32" strokeWidth="4" />
		<circle cx="24" cy="35" r="3" fill="#efbd56" />
	</svg>
);

export const VisibleTrapDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 24 12 9 18 20 24 7 30 20 36 9 43 24 39 35 31 41H17L9 35Z"
			fill="#ef5866"
			stroke="#d0dce6"
			strokeWidth="2.2"
		/>
		<path
			d="M12 29 19 23 24 30 29 23 36 29 32 36H16Z"
			fill="#17202b"
			stroke="#d0dce6"
			strokeWidth="1.8"
		/>
		<path d="M9 37H39" stroke="#9d273c" strokeWidth="4" />
		<circle cx="24" cy="35" r="3" fill="#edbb60" />
	</svg>
);

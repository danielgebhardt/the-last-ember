import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const EntranceLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 46V18Q7 5 24 4Q41 5 43 18V46H34V20Q33 13 24 13Q15 13 14 20V46Z"
			fill="#53636f"
			stroke="#9dabb4"
			strokeWidth="2.2"
		/>
		<path
			d="M14 45V20Q15 13 24 13Q33 13 34 20V45Z"
			fill="#202d38"
			stroke="#394651"
			strokeWidth="1.6"
		/>
		<path
			d="M7 22H14M34 22H41M10 12 16 16M32 16 38 12M7 34H14M34 34H41"
			fill="none"
			stroke="#394651"
			strokeWidth="2"
		/>
		<path
			d="M9 20 11 17 13 20 11 24ZM35 20 37 17 39 20 37 24Z"
			fill="#bd8435"
		/>
		<path d="M11 17V24M37 17V24" stroke="#f5c66d" strokeWidth="1.1" />
		<path d="M17 43H31" stroke="#bd8435" strokeWidth="3.5" />
	</svg>
);

export const EntranceDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 46V18Q7 5 24 4Q41 5 43 18V46H34V20Q33 13 24 13Q15 13 14 20V46Z"
			fill="#74818e"
			stroke="#b1beca"
			strokeWidth="2.2"
		/>
		<path
			d="M14 45V20Q15 13 24 13Q33 13 34 20V45Z"
			fill="#182431"
			stroke="#202a34"
			strokeWidth="1.6"
		/>
		<path
			d="M7 22H14M34 22H41M10 12 16 16M32 16 38 12M7 34H14M34 34H41"
			fill="none"
			stroke="#202a34"
			strokeWidth="2"
		/>
		<path
			d="M9 20 11 17 13 20 11 24ZM35 20 37 17 39 20 37 24Z"
			fill="#e1ac57"
		/>
		<path d="M11 17V24M37 17V24" stroke="#ffe3a0" strokeWidth="1.1" />
		<path d="M17 43H31" stroke="#e1ac57" strokeWidth="3.5" />
	</svg>
);

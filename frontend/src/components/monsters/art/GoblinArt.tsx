import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const GoblinLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M13 17 2 8 7 28 14 26M35 17 46 8 41 28 34 26"
			fill="#38843e"
			stroke="#38843e"
			strokeWidth="2"
		/>
		<path
			d="M12 18 24 11 36 18 35 34 24 44 13 34Z"
			fill="#38843e"
			stroke="#7b8a95"
			strokeWidth="1.6"
		/>
		<path
			d="M16 25 22 28 20 31 15 28ZM32 25 26 28 28 31 33 28Z"
			fill="#f1f0eb"
		/>
		<path d="M18 36Q24 40 30 36" stroke="#f1f0eb" strokeWidth="2.4" />
	</svg>
);

export const GoblinDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M13 17 2 8 7 28 14 26M35 17 46 8 41 28 34 26"
			fill="#88d276"
			stroke="#88d276"
			strokeWidth="2"
		/>
		<path
			d="M12 18 24 11 36 18 35 34 24 44 13 34Z"
			fill="#88d276"
			stroke="#58677a"
			strokeWidth="1.6"
		/>
		<path
			d="M16 25 22 28 20 31 15 28ZM32 25 26 28 28 31 33 28Z"
			fill="#16202b"
		/>
		<path d="M18 36Q24 40 30 36" stroke="#16202b" strokeWidth="2.4" />
	</svg>
);

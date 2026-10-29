import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const HealingPotionLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinejoin="round"
		strokeLinecap="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M19 5H29V14L33 19V39Q33 44 28 44H20Q15 44 15 39V19L19 14Z"
			fill="#a9c3d1"
			fillOpacity=".5"
			stroke="#354b5d"
			strokeWidth="1.8"
		/>
		<path d="M17 24H31V40Q31 42 28 42H20Q17 42 17 40Z" fill="#cd3445" />
		<path
			d="M19 18 17 22V34"
			stroke="white"
			strokeOpacity=".7"
			strokeWidth="2"
			fill="none"
		/>
		<path
			d="M18 5H30V11H18Z"
			fill="#a87649"
			stroke="#354b5d"
			strokeWidth="1.3"
		/>
	</svg>
);

export const HealingPotionDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinejoin="round"
		strokeLinecap="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M19 5H29V14L33 19V39Q33 44 28 44H20Q15 44 15 39V19L19 14Z"
			fill="#7091a9"
			fillOpacity=".5"
			stroke="#edf5ff"
			strokeWidth="1.8"
		/>
		<path d="M17 24H31V40Q31 42 28 42H20Q17 42 17 40Z" fill="#e94455" />
		<path
			d="M19 18 17 22V34"
			stroke="white"
			strokeOpacity=".7"
			strokeWidth="2"
			fill="none"
		/>
		<path
			d="M18 5H30V11H18Z"
			fill="#be8f65"
			stroke="#edf5ff"
			strokeWidth="1.3"
		/>
	</svg>
);

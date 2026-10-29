import type { FullColorArtProps } from "../icons/FullColorIcon";

// Full colour: gradient armor scales with a flame at the heart, for both themes.
const EmberscaleMailIcon = ({ id, ...props }: FullColorArtProps) => (
	<svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
		<defs>
			<linearGradient id={`${id}-armor`} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#ffab48" />
				<stop offset="50%" stopColor="#e96b24" />
				<stop offset="100%" stopColor="#8e361c" />
			</linearGradient>
			<linearGradient id={`${id}-flame`} x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stopColor="#ff4a16" />
				<stop offset="55%" stopColor="#ffc02e" />
				<stop offset="100%" stopColor="#fff0a1" />
			</linearGradient>
		</defs>
		<path
			d="M14 5L8 8 3 16 8 21 10 37 24 44 38 37 40 21 45 16 40 8 34 5 30 10H18Z"
			fill="#552719"
			stroke="#2c1a19"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<path
			d="M14 7L9 10 5 16 10 19 12 35 24 41 36 35 38 19 43 16 39 10 34 7 29 13H19Z"
			fill={`url(#${id}-armor)`}
			stroke="#ffbd67"
			strokeWidth="1.4"
			strokeLinejoin="round"
		/>
		<path
			d="M19 13L14 17 15 34 24 39 33 34 34 17 29 13"
			fill="#a7441c"
			fillOpacity=".55"
			stroke="#813518"
			strokeWidth="1.3"
		/>
		<path
			d="M10 13L14 17M38 13L34 17M12 35L16 33M36 35L32 33"
			stroke="#ffd084"
			strokeWidth="1.6"
			strokeLinecap="round"
		/>
		<path
			d="M24 13C25 20 19 20 19 25 17 23 17 21 17 20 12 28 16 35 24 36 33 35 35 27 30 22 30 26 28 27 27 27 28 22 25 18 24 13Z"
			fill={`url(#${id}-flame)`}
			stroke="#7c3014"
			strokeWidth="1.3"
			strokeLinejoin="round"
		/>
		<path
			d="M24 24C24 28 20 29 21 32 22 35 27 35 28 31 28 29 26 28 26 27 26 30 24 30 24 24Z"
			fill="#fff2aa"
		/>
		<path
			d="M18 7L24 11 30 7"
			fill="none"
			stroke="#ffd18a"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
	</svg>
);

export default EmberscaleMailIcon;

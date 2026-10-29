import { type SVGProps, useId } from "react";

type StairIconProps = SVGProps<SVGSVGElement>;

const Staircase = ({
	descending,
	...props
}: StairIconProps & { descending: boolean }) => {
	const cutoutId = useId();
	const arrow = descending
		? "M11 12H13V16H15L12 19L9 16H11Z"
		: "M12 12L15 15H13V19H11V15H9Z";
	const heights = descending ? [16, 12, 8, 4] : [4, 8, 12, 16];

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			// Cropped close to the steps, which span 4–20, leaving 6% of the tile
			// clear on each side against neighbouring walls.
			viewBox="2.91 2.91 18.18 18.18"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			<defs>
				<mask
					id={cutoutId}
					maskUnits="userSpaceOnUse"
					x="0"
					y="0"
					width="24"
					height="24"
				>
					<rect width="24" height="24" fill="white" />
					<path
						d={arrow}
						transform={`translate(${descending ? -2 : 2} 0)`}
						fill="black"
						stroke="black"
						strokeWidth="0.5"
						strokeLinejoin="round"
					/>
				</mask>
			</defs>
			<g mask={`url(#${cutoutId})`}>
				{heights.map((height, index) => (
					<rect
						key={height}
						x={4 + index * 4}
						y={20 - height}
						width="4"
						height={height}
					/>
				))}
			</g>
		</svg>
	);
};

export const StairsUpIcon = (props: StairIconProps) => (
	<Staircase {...props} descending={false} />
);

export const StairsDownIcon = (props: StairIconProps) => (
	<Staircase {...props} descending={true} />
);

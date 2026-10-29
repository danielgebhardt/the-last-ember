import type { ReactNode } from "react";

type FantasyRailProps = {
	children: ReactNode;
	className?: string;
};

const RailEnd = ({ right = false }: { right?: boolean }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 28 80"
		preserveAspectRatio="none"
		className={`h-full w-7 text-amber-800 dark:text-amber-500 ${
			right ? "-scale-x-100" : ""
		}`}
	>
		{/* Outer engraved border */}
		<path
			d="M28 0 H15 L7 9 V25 L2 34 V46 L7 55 V71 L15 80 H28"
			fill="var(--panel-surface)"
			stroke="currentColor"
			strokeWidth="1.4"
			vectorEffect="non-scaling-stroke"
		/>

		{/* Inner decorative engraving */}
		<path
			d="M28 7 H18 L13 13 V28 L8 36 V44 L13 52 V67 L18 73 H28"
			fill="none"
			stroke="currentColor"
			strokeOpacity="0.45"
			strokeWidth="0.8"
			vectorEffect="non-scaling-stroke"
		/>

		{/* Central diamond */}
		<path
			d="M3 40 L12 31 L21 40 L12 49 Z"
			fill="var(--panel-surface)"
			stroke="currentColor"
			strokeWidth="1.1"
			vectorEffect="non-scaling-stroke"
		/>

		<path d="M8 40 L12 35 L16 40 L12 45 Z" fill="currentColor" />
	</svg>
);

const FantasyRail = ({ children, className = "" }: FantasyRailProps) => (
	<div className={`relative min-w-0 ${className}`}>
		{/* Matching full-opacity horizontal borders */}
		<div
			aria-hidden="true"
			className="
            pointer-events-none absolute inset-x-0 inset-y-0 sm:inset-x-7
            border-y border-amber-800
            dark:border-amber-500
         "
		/>

		{/* Left end */}
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-7 sm:block"
		>
			<RailEnd />
		</div>

		{/* Right end */}
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-7 sm:block"
		>
			<RailEnd right />
		</div>

		{/* Existing content */}
		<div className="relative z-10 min-w-0">{children}</div>
	</div>
);

export default FantasyRail;

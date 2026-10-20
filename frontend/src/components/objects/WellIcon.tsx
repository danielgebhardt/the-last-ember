import type { SVGProps } from "react";

// A stone well with a roof; a fresh well shows a coin glinting above the water.
export default function WellIcon({
	spent = false,
	...props
}: SVGProps<SVGSVGElement> & { spent?: boolean }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M3 8.5 12 3l9 5.5" />
			<path d="M6 7v6M18 7v6" />
			<path d="M4 13h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
			<path d="M4 16.5h16M9 13v3.5M15 13v3.5M12 16.5V21" />
			{spent ? (
				<path d="M10 10h4" />
			) : (
				<circle
					cx="12"
					cy="10"
					r="1.6"
					fill="currentColor"
					className="text-item-gear"
				/>
			)}
		</svg>
	);
}

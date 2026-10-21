import type { SVGProps } from "react";

// An oval standing mirror; a live mirror holds a shadowed figure, a spent one is cracked.
export default function MirrorIcon({
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
			<ellipse cx="12" cy="9.5" rx="5.5" ry="7" />
			<path d="M12 16.5V20M8 21h8" />
			{spent ? (
				<path d="m10 5 2 3.5-1.5 2.5 2.5 3M12 8.5l2.5-1.5" />
			) : (
				<g className="text-monster-shadow">
					<circle cx="12" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
					<path d="M9.5 13.5q2.5-4 5 0" fill="currentColor" stroke="none" />
				</g>
			)}
		</svg>
	);
}

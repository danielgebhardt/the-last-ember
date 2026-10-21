import type { SVGProps } from "react";

// A standing stone arch with a swirl; a spent portal's swirl is gone.
export default function RunicPortalIcon({
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
			<path d="M5 21V10a7 7 0 0 1 14 0v11" />
			<path d="M3 21h18" />
			<path d="M8.5 6.5 9.5 8M15.5 6.5 14.5 8M12 4v1.5" />
			{!spent && (
				<path
					className="text-item-mana"
					d="M12 17a2.5 2.5 0 1 1 2.5-2.5c0 2.5-3 4-5.5 3.5"
				/>
			)}
		</svg>
	);
}

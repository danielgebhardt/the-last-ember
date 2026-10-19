import type { SVGProps } from "react";

// Long muzzle, raised ear, back line, and forepaw make a more bestial wolf silhouette.
const WolfIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="m6 14-3-2 2-4 3-1 3-3 3 2h4l3 3-1 4-3 2" />
        <path d="M8 8 7 4l4 2" />
        <path d="M14 8h.1" />
        <path d="M16 10q2 1 3 3" />
        <path d="M7 14v4m4-4v4m6-3v3" />
        <path d="M8 18h8" />
    </svg>
);

export default WolfIcon;
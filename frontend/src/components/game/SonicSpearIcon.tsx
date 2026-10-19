import type { SVGProps } from "react";

// Spearhead with sound-wave rings behind it to show a piercing sonic projectile.
const SonicSpearIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="m4 12 10-6v3h5v6h-5v3Z" />
        <path d="M3 9c2 1 2 5 0 6" />
        <path d="M1.5 7c3 2 3 8 0 10" />
    </svg>
);

export default SonicSpearIcon;
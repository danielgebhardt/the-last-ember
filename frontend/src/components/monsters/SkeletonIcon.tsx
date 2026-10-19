import type { SVGProps } from "react";

// Skull, hollow eyes, tooth bar, and crossed bones read clearly even at tile size.
const SkeletonIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M8 6a4 4 0 1 1 8 0v3a4 4 0 0 1-8 0Z" />
        <path d="M10 8h.1M14 8h.1" />
        <path d="M10 11h4" />
        <path d="M11 13h2" />
        <path d="M12 13v3" />
        <path d="m7 17 3 3m0-3-3 3" />
        <path d="m14 17 3 3m0-3-3 3" />
        <path d="M9 16h6" />
    </svg>
);

export default SkeletonIcon;
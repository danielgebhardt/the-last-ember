import type { SVGProps } from "react";

// Layered lightning fork with impact flare; more forceful than a generic bolt.
const ShockIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M13 2 6 13h5l-1 9 8-12h-5Z" />
        <path d="M4 9h2M18 5h2M17 17h3M3 18h2" />
    </svg>
);

export default ShockIcon;
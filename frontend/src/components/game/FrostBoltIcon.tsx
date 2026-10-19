import type { SVGProps } from "react";

// Icy shard with snowflake accents; clearer than a generic snowflake.
const FrostBoltIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="m5 19 8-8" />
        <path d="m12 11 6-6 1 5-5 5Z" />
        <path d="M16 4v4M14 6h4" />
        <path d="M7 14v4M5 16h4" />
        <path d="m4 20 3-1-2-2Z" />
    </svg>
);

export default FrostBoltIcon;
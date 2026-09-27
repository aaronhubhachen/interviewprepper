import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="2" />
    </svg>
  );
}

export function ReviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="3.5" width="12" height="15" rx="2.5" />
      <path d="M4 7v10.5A3 3 0 0 0 7 20.5h8" />
      <path d="M10 9h5M10 12.5h3" />
    </svg>
  );
}

export function PracticeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13" />
    </svg>
  );
}

export function SparIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </svg>
  );
}

export function GrillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c-3.6 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.7-8.3.4 1.6 1.2 2.8 2.3 3.4.3-2.8 1.7-5 3.9-6.4-.3 2.5.7 4.4 2 6.1 1 1.4 1.6 3 1.6 5.2 0 3.6-3.1 6.2-7 6.2Z" />
      <path d="M12 21c-1.5 0-2.7-1.1-2.7-2.6 0-1.6 1.3-2.4 1.8-3.9.8.9 1.2 1.2 1.8 1.4.2-.9.6-1.6 1.2-2.1.3 1.3 1.4 2.3 1.4 4 0 1.8-1.5 3.2-3.5 3.2Z" />
    </svg>
  );
}

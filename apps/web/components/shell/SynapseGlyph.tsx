import { cn } from "@/lib/cn";

/**
 * Two neurons meeting at a synaptic cleft; the signal path "fires" (motion-safe).
 * Decorative by default; pass a title to expose it to assistive tech.
 */
export function SynapseGlyph({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-7 w-7", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="synapse-glyph-g" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" stroke="url(#synapse-glyph-g)" strokeOpacity="0.35" />
      {/* Presynaptic neuron + dendrites */}
      <circle cx="9" cy="12" r="3" fill="url(#synapse-glyph-g)" />
      <path d="M9 9V5.5M6.4 13.5 3.8 15M7 10 4.5 8" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" />
      {/* Axon to the cleft */}
      <path
        d="M11.5 13.8c2.2 1.4 3.4 2.3 4.6 3.6"
        stroke="url(#synapse-glyph-g)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="3 3"
        className="motion-safe:animate-fire"
      />
      {/* Postsynaptic neuron */}
      <circle cx="21.5" cy="20.5" r="3.4" fill="#22d3ee" fillOpacity="0.9" />
      <path d="M24 23.5 26.5 26M24.8 18.6 28 17.5M21.5 24v3.5" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" />
      {/* Spark in the cleft */}
      <circle cx="17.6" cy="18.3" r="1.1" fill="#fff" className="motion-safe:animate-pulse-glow" />
    </svg>
  );
}

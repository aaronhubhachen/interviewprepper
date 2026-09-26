"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import { useDueCount } from "./DueCountProvider";
import { DashboardIcon, PracticeIcon, ReviewIcon, SparIcon } from "./NavIcons";
import { SynapseGlyph } from "./SynapseGlyph";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: "due";
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/review", label: "Review", Icon: ReviewIcon, badge: "due" },
  { href: "/practice", label: "Practice", Icon: PracticeIcon },
  { href: "/spar", label: "Spar", Icon: SparIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function DueBadge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  const text = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "inline-grid min-w-5 place-items-center rounded-full bg-axon px-1.5 font-semibold leading-5 text-ink-950 tabular-nums",
        compact ? "absolute -right-2.5 -top-1.5 h-4 min-w-4 px-1 text-[0.625rem] leading-4" : "h-5 text-[0.7rem]",
      )}
    >
      {text}
      <span className="sr-only"> {count === 1 ? "card" : "cards"} due</span>
    </span>
  );
}

/** Sticky top bar: wordmark + desktop links. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const { due } = useDueCount();
  const dueNow = due?.dueNow ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 rounded-lg" aria-label="Synapse home">
          <SynapseGlyph className="h-8 w-8 transition-transform duration-300 motion-safe:group-hover:rotate-12" />
          <span className="font-display text-xl font-semibold tracking-tight text-fg">
            Syn<span className="text-gradient">apse</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, Icon, badge }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-ink-800 text-fg shadow-glow" : "text-fg-muted hover:bg-ink-800/70 hover:text-fg",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-synapse" : "text-fg-subtle")} />
                    {label}
                    {badge === "due" ? <DueBadge count={dueNow} /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Fixed bottom tab bar on small screens (the top bar hides its links below md). */
export function MobileNav() {
  const pathname = usePathname() ?? "/";
  const { due } = useDueCount();
  const dueNow = due?.dueNow ?? 0;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ href, label, Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active ? "text-fg" : "text-fg-subtle hover:text-fg",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-6 w-6", active && "text-synapse drop-shadow-[0_0_8px_rgb(167_139_250/0.6)]")} />
                  {badge === "due" ? <DueBadge count={dueNow} compact /> : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

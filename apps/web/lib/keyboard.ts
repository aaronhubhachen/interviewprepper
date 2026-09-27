/**
 * Keyboard helpers for client components:
 * - platform-aware shortcut labels (Monaco's KeyMod.CtrlCmd is ⌘ on Apple
 *   platforms, and its "Tab moves focus" toggle is Ctrl+Shift+M there);
 * - focus scoping for single-key shortcuts (WCAG 2.1.4: a bare "1" or "R"
 *   only fires while its component has focus).
 */
import { useSyncExternalStore } from "react";

interface NavigatorLike {
  userAgent?: string;
}

/**
 * Same test Monaco uses to pick its macOS keymap (userAgent has Macintosh,
 * iPad or iPhone), so the labels always match the real bindings.
 */
export function isApplePlatform(nav: NavigatorLike | null | undefined): boolean {
  return /Macintosh|iPad|iPhone|iPod/.test(nav?.userAgent ?? "");
}

const noopSubscribe = () => () => {};

/** False while server rendering / hydrating (so the first client render matches the HTML), then the real answer. */
export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isApplePlatform(typeof navigator === "undefined" ? null : navigator),
    () => false,
  );
}

export interface ShortcutLabels {
  /** <Kbd> text for the primary modifier: "⌘" or "Ctrl". */
  mod: string;
  /** aria-keyshortcuts for mod + key, e.g. "Meta+Enter" / "Control+Enter". */
  aria: (key: string) => string;
  /** Tooltip form of mod + key, e.g. "⌘Enter" / "Ctrl+Enter". */
  combo: (key: string) => string;
  /** Monaco's "Toggle Tab Key Moves Focus" keys, one <Kbd> each. */
  tabFocusKeys: readonly string[];
  /** The same chord for a screen reader label: "Control M" / "Control Shift M". */
  tabFocusSpoken: string;
}

export function shortcutLabels(apple: boolean): ShortcutLabels {
  return apple
    ? {
        mod: "⌘",
        aria: (key) => `Meta+${key}`,
        combo: (key) => `⌘${key}`,
        tabFocusKeys: ["⌃", "⇧", "M"],
        tabFocusSpoken: "Control Shift M",
      }
    : {
        mod: "Ctrl",
        aria: (key) => `Control+${key}`,
        combo: (key) => `Ctrl+${key}`,
        tabFocusKeys: ["Ctrl", "M"],
        tabFocusSpoken: "Control M",
      };
}

/** Anything with Node#contains (a DOM element, or a stub in tests). */
export interface FocusScope {
  contains(other: Node | null): boolean;
}

/**
 * True when a key event's target sits inside `scope`. Single-key shortcuts
 * check this so they only fire while their component has focus (a stray key
 * with focus elsewhere, or on <body>, does nothing).
 */
export function isWithinScope(scope: FocusScope | null | undefined, target: EventTarget | null): boolean {
  return Boolean(scope && target && scope.contains(target as Node));
}

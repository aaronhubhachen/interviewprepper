"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const OUT = [{ transform: "perspective(1600px) rotateY(0deg)" }, { transform: "perspective(1600px) rotateY(90deg)" }];
const IN = [{ transform: "perspective(1600px) rotateY(-90deg)" }, { transform: "perspective(1600px) rotateY(0deg)" }];

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * A card that flips (rotateY) between a front and a back face. Only one face
 * is in the DOM at a time, so height follows the visible face and hidden
 * content is never focusable. Honors prefers-reduced-motion (instant swap).
 * `onFlipped` fires once the new face is mounted (e.g. to move focus).
 */
export function FlipCard({
  flipped,
  front,
  back,
  onFlipped,
  className,
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  onFlipped?: (side: "front" | "back") => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(flipped);
  const swapped = useRef(false);
  const onFlippedRef = useRef(onFlipped);
  useEffect(() => {
    onFlippedRef.current = onFlipped;
  }, [onFlipped]);

  useEffect(() => {
    if (flipped === shown) return;
    const element = ref.current;
    if (!element || prefersReducedMotion() || typeof element.animate !== "function") {
      swapped.current = true;
      setShown(flipped);
      return;
    }
    let active = true;
    const out = element.animate(OUT, { duration: 170, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
    out.finished.then(
      () => {
        if (!active) return;
        swapped.current = true;
        setShown(flipped);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [flipped, shown]);

  useLayoutEffect(() => {
    if (!swapped.current) return;
    swapped.current = false;
    const element = ref.current;
    if (element && !prefersReducedMotion() && typeof element.animate === "function") {
      // Replaces the finished "out" animation (which holds 90deg via fill: forwards).
      element.getAnimations().forEach((animation) => animation.cancel());
      element.animate(IN, { duration: 230, easing: "cubic-bezier(0, 0, 0.2, 1)" });
    }
    onFlippedRef.current?.(shown ? "back" : "front");
  }, [shown]);

  return (
    <div ref={ref} className={cn("will-change-transform [backface-visibility:hidden]", className)}>
      {shown ? back : front}
    </div>
  );
}

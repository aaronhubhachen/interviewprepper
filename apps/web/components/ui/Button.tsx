import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "motion-safe:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-synapse-strong bg-[linear-gradient(135deg,var(--color-synapse-strong),var(--color-synapse-deep))] " +
    "text-white shadow-glow hover:brightness-110 focus-visible:brightness-110",
  secondary: "bg-ink-700 text-fg border border-line-strong hover:bg-ink-600 hover:border-synapse/50",
  ghost: "text-fg-muted hover:text-fg hover:bg-ink-700/70",
  outline: "border border-line-strong text-fg hover:border-synapse hover:text-synapse-soft bg-transparent",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  success: "bg-success/15 text-success border border-success/40 hover:bg-success/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0 text-base",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Class string for anything that should look like a Button (links, labels). */
export function buttonClasses({ variant = "primary", size = "md", fullWidth, className }: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

export interface ButtonProps extends ComponentProps<"button">, Omit<ButtonStyleOptions, "className"> {
  /** Shows a spinner, sets aria-busy, and disables the button. */
  loading?: boolean;
  /** Screen-reader text while loading (default "Working…"). */
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingLabel = "Working…",
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner size="sm" label={loadingLabel} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className">, Omit<ButtonStyleOptions, "className"> {
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** A next/link styled as a Button (for navigation, never for actions). */
export function ButtonLink({ variant, size, fullWidth, className, leftIcon, rightIcon, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

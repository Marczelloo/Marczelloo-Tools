import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SurfaceProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "overlay" | "muted";
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article";
  interactive?: boolean;
}

const variantClasses: Record<NonNullable<SurfaceProps["variant"]>, string> = {
  default: "bg-zinc-950 border-white/10",
  elevated: "bg-zinc-900 border-white/10",
  overlay: "bg-zinc-900/90 border-white/10",
  muted: "bg-zinc-950/50 border-white/5",
};

const paddingClasses: Record<NonNullable<SurfaceProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/**
 * Surface - Card/panel component with consistent styling
 *
 * Use for cards, panels, and elevated content areas.
 * Provides consistent background, border, and optional interactive states.
 *
 * @example
 * ```tsx
 * <Surface variant="elevated" padding="lg">
 *   <h2>Card Title</h2>
 *   <p>Card content...</p>
 * </Surface>
 * ```
 */
export function Surface({
  children,
  className,
  variant = "default",
  padding = "md",
  as: Component = "div",
  interactive = false,
}: SurfaceProps): React.JSX.Element {
  return (
    <Component
      className={cn(
        "rounded-sm border",
        variantClasses[variant],
        paddingClasses[padding],
        interactive && "transition-all hover:border-white/20 hover:bg-white/5 cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
}

export default Surface;

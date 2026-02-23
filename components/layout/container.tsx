import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  as?: "div" | "section" | "article" | "main";
  padding?: boolean;
  centered?: boolean;
}

const sizeClasses: Record<NonNullable<ContainerProps["size"]>, string> = {
  sm: "max-w-3xl", // 768px
  md: "max-w-5xl", // 1024px
  lg: "max-w-6xl", // 1152px
  xl: "max-w-7xl", // 1280px
  full: "max-w-full",
};

/**
 * Container - Reusable layout container
 *
 * Provides consistent max-width constraints and optional padding.
 * Use this as the primary wrapper for page content.
 *
 * @example
 * ```tsx
 * <Container size="lg">
 *   <h1>Page Title</h1>
 * </Container>
 * ```
 */
export function Container({
  children,
  className,
  size = "lg",
  as: Component = "div",
  padding = true,
  centered = true,
}: ContainerProps): React.JSX.Element {
  return (
    <Component
      className={cn(
        sizeClasses[size],
        centered && "mx-auto",
        padding && "px-4 sm:px-6 lg:px-8",
        "w-full",
        className
      )}
    >
      {children}
    </Component>
  );
}

export default Container;

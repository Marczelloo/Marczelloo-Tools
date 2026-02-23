"use client";

import { cn } from "@/lib/utils";
import { Container, Surface } from "@/components/layout";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface FormLayoutProps {
  /** Form content - typically form fields */
  children: ReactNode;

  /** Form submission handler */
  onSubmit?: () => void;

  /** Optional header */
  header?: ReactNode;

  /** Optional actions below form */
  actions?: ReactNode;

  /** Form layout direction */
  direction?: "vertical" | "horizontal";

  /** Maximum width */
  maxWidth?: "sm" | "md" | "lg";

  /** Show as card surface */
  asCard?: boolean;

  /** Additional classes */
  className?: string;
}

export interface FormSectionProps {
  /** Section title */
  title?: string;

  /** Section description */
  description?: string;

  /** Section content */
  children: ReactNode;

  /** Additional classes */
  className?: string;
}

export interface FormRowProps {
  /** Row content */
  children: ReactNode;

  /** Gap between items */
  gap?: "sm" | "md" | "lg";

  /** Additional classes */
  className?: string;
}

// ============================================================================
// WIDTH CLASSES
// ============================================================================

const maxWidthClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

const gapClasses = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

// ============================================================================
// FORM SECTION COMPONENT
// ============================================================================

/**
 * FormSection - Groups related form fields
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps): React.JSX.Element {
  return (
    <fieldset className={cn("mb-6 last:mb-0", className)}>
      {title && (
        <legend className="block mb-3 text-sm font-semibold text-content-primary">
          {title}
        </legend>
      )}
      {description && (
        <p className="mb-4 text-sm text-content-tertiary">{description}</p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  );
}

// ============================================================================
// FORM ROW COMPONENT
// ============================================================================

/**
 * FormRow - Horizontal layout for form fields
 */
export function FormRow({
  children,
  gap = "md",
  className,
}: FormRowProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-wrap items-start", gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// FORM LAYOUT
// ============================================================================

/**
 * FormLayout - Layout for form-heavy tools
 *
 * Use for: Hash generator, settings, configuration tools
 *
 * Structure:
 * - Vertical form layout with sections
 * - Optional card wrapper
 * - Consistent field spacing
 *
 * @example
 * ```tsx
 * <FormLayout
 *   header={<h2>Generate Hash</h2>}
 *   actions={<SubmitButton />}
 * >
 *   <FormSection title="Input">
 *     <TextField label="Text" />
 *   </FormSection>
 * </FormLayout>
 * ```
 */
export function FormLayout({
  children,
  onSubmit,
  header,
  actions,
  direction = "vertical",
  maxWidth = "md",
  asCard = true,
  className,
}: FormLayoutProps): React.JSX.Element {
  const content = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cn(
        "space-y-6",
        direction === "horizontal" && "flex flex-wrap gap-6 space-y-0"
      )}
    >
      {children}

      {/* Actions */}
      {actions && (
        <div className="pt-6 border-t border-border flex items-center gap-3">
          {actions}
        </div>
      )}
    </form>
  );

  return (
    <div className={cn("py-6", className)}>
      <Container size="md" className={cn(maxWidthClasses[maxWidth], "mx-auto")}>
        {/* Header */}
        {header && (
          <div className="mb-6">
            {header}
          </div>
        )}

        {/* Form content */}
        {asCard ? (
          <Surface variant="default" padding="lg">
            {content}
          </Surface>
        ) : (
          content
        )}
      </Container>
    </div>
  );
}

export default FormLayout;

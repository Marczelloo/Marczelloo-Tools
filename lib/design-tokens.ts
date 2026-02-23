/**
 * Design System Tokens
 * Type-safe access to CSS custom properties
 * Per CLAUDE.md Section 5 - Design Principles
 */

// ============================================================================
// BACKGROUND COLORS
// ============================================================================
export const backgrounds = {
  primary: "var(--background-primary)",
  secondary: "var(--background-secondary)",
  tertiary: "var(--background-tertiary)",
  elevated: "var(--background-elevated)",
} as const;

// ============================================================================
// SURFACE COLORS
// ============================================================================
export const surfaces = {
  default: "var(--surface-default)",
  elevated: "var(--surface-elevated)",
  overlay: "var(--surface-overlay)",
  muted: "var(--surface-muted)",
} as const;

// ============================================================================
// BORDER COLORS
// ============================================================================
export const borders = {
  subtle: "var(--border-subtle)",
  default: "var(--border-default)",
  emphasis: "var(--border-emphasis)",
  strong: "var(--border-strong)",
  accent: "var(--border-accent)",
} as const;

// ============================================================================
// TEXT COLORS
// ============================================================================
export const text = {
  primary: "var(--text-primary)",
  secondary: "var(--text-secondary)",
  tertiary: "var(--text-tertiary)",
  muted: "var(--text-muted)",
  inverse: "var(--text-inverse)",
} as const;

// ============================================================================
// ACCENT COLORS
// ============================================================================
export const accents = {
  blue: "var(--accent-blue)",
  blueMuted: "var(--accent-blue-muted)",
  green: "var(--accent-green)",
  greenMuted: "var(--accent-green-muted)",
  yellow: "var(--accent-yellow)",
  yellowMuted: "var(--accent-yellow-muted)",
  red: "var(--accent-red)",
  redMuted: "var(--accent-red-muted)",
  purple: "var(--accent-purple)",
  purpleMuted: "var(--accent-purple-muted)",
} as const;

// ============================================================================
// STATUS COLORS
// ============================================================================
export const status = {
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  error: "var(--status-error)",
  info: "var(--status-info)",
} as const;

// ============================================================================
// INTERACTIVE COLORS
// ============================================================================
export const interactive = {
  hover: "var(--interactive-hover)",
  active: "var(--interactive-active)",
  selected: "var(--interactive-selected)",
  disabled: "var(--interactive-disabled)",
} as const;

// ============================================================================
// SPACING SCALE (8px base)
// ============================================================================
export const spacing = {
  0: "var(--space-0)",
  1: "var(--space-1)", // 4px
  2: "var(--space-2)", // 8px
  3: "var(--space-3)", // 12px
  4: "var(--space-4)", // 16px
  5: "var(--space-5)", // 20px
  6: "var(--space-6)", // 24px
  7: "var(--space-7)", // 28px
  8: "var(--space-8)", // 32px
  10: "var(--space-10)", // 40px
  12: "var(--space-12)", // 48px
  16: "var(--space-16)", // 64px
  20: "var(--space-20)", // 80px
  24: "var(--space-24)", // 96px
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================
export const fontSize = {
  xs: "var(--font-size-xs)", // 12px
  sm: "var(--font-size-sm)", // 14px
  base: "var(--font-size-base)", // 16px
  lg: "var(--font-size-lg)", // 18px
  xl: "var(--font-size-xl)", // 20px
  "2xl": "var(--font-size-2xl)", // 24px
  "3xl": "var(--font-size-3xl)", // 30px
  "4xl": "var(--font-size-4xl)", // 36px
} as const;

export const fontWeight = {
  normal: "var(--font-weight-normal)", // 400
  medium: "var(--font-weight-medium)", // 500
  semibold: "var(--font-weight-semibold)", // 600
} as const;

export const lineHeight = {
  tight: "var(--line-height-tight)", // 1.25
  normal: "var(--line-height-normal)", // 1.5
  relaxed: "var(--line-height-relaxed)", // 1.75
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const radius = {
  sm: "var(--radius-sm)", // 4px
  md: "var(--radius-md)", // 8px
  lg: "var(--radius-lg)", // 12px
  xl: "var(--radius-xl)", // 16px
  full: "var(--radius-full)", // 9999px
} as const;

// ============================================================================
// SHADOWS
// ============================================================================
export const shadows = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  glow: "var(--shadow-glow)",
} as const;

// ============================================================================
// TRANSITIONS (per CLAUDE.md motion rules)
// ============================================================================
export const duration = {
  fast: "var(--duration-fast)", // 150ms
  normal: "var(--duration-normal)", // 200ms
  slow: "var(--duration-slow)", // 250ms
} as const;

export const easing = {
  default: "var(--easing-default)",
} as const;

// ============================================================================
// COMBINED TOKENS OBJECT
// ============================================================================
export const tokens = {
  backgrounds,
  surfaces,
  borders,
  text,
  accents,
  status,
  interactive,
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  shadows,
  duration,
  easing,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type BackgroundToken = keyof typeof backgrounds;
export type SurfaceToken = keyof typeof surfaces;
export type BorderToken = keyof typeof borders;
export type TextToken = keyof typeof text;
export type AccentToken = keyof typeof accents;
export type StatusToken = keyof typeof status;
export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof fontSize;
export type FontWeightToken = keyof typeof fontWeight;
export type RadiusToken = keyof typeof radius;
export type ShadowToken = keyof typeof shadows;
export type DurationToken = keyof typeof duration;

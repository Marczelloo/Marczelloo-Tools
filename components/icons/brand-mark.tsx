import type { SVGProps } from "react";

export type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * Marczelloo Tools monogram.
 *
 * The white utility tile preserves the existing monochrome identity while the
 * M-shaped command stroke makes the product recognizable without relying on a
 * generic terminal glyph.
 */
export function BrandMark({ title, ...props }: BrandMarkProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="4" fill="white" />
      <path
        d="M7 21V11L12 16L17 11V21M21 21H25"
        stroke="black"
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export default BrandMark;

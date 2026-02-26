// components/tool-ui/TactileButton.tsx
"use client";

import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface TactileButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function TactileButton({
  variant = "primary",
  loading = false,
  fullWidth = false,
  type = "button",
  disabled,
  children,
  className = "",
  ...props
}: TactileButtonProps): React.JSX.Element {
  const baseClasses = "font-medium rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none";
  const widthClass = fullWidth ? "w-full" : "";
  const disabledAttr = disabled || loading;

  const variantClasses = {
    primary: disabledAttr
      ? "bg-zinc-900 border border-dashed border-white/10 text-zinc-600 cursor-not-allowed"
      : loading
      ? "bg-zinc-800 text-zinc-400 cursor-wait"
      : "bg-white text-black hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)]",
    secondary: disabledAttr
      ? "bg-zinc-900 border border-white/10 text-zinc-600 cursor-not-allowed"
      : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white",
    ghost: disabledAttr
      ? "bg-transparent text-zinc-700 cursor-not-allowed"
      : "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white",
  };

  return (
    <button
      type={type}
      disabled={disabledAttr}
      aria-busy={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

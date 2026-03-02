"use client";

import { forwardRef } from "react";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: readonly TabItem[];
  className?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, tabs, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex border-b border-white/10 ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            role="tab"
            aria-selected={value === tab.value}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ${
              value === tab.value
                ? "border-white text-white"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

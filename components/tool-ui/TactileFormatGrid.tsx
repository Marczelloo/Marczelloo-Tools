// components/tool-ui/TactileFormatGrid.tsx
"use client";

export interface FormatOption {
  value: string;
  label: string;
  desc: string;
}

interface TactileFormatGridProps {
  options: readonly FormatOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 3 | 4 | 5;
}

export function TactileFormatGrid({
  options,
  value,
  onChange,
  columns = 3,
}: TactileFormatGridProps): React.JSX.Element {
  const gridCols = columns === 3 ? "grid-cols-3" : columns === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-3 rounded-md text-sm transition-all duration-150 ${
            value === option.value
              ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5 hover:border-white/20 active:scale-[0.98]"
          }`}
        >
          <span className="font-medium">{option.label}</span>
          <span className="block text-xs opacity-75 mt-0.5">{option.desc}</span>
        </button>
      ))}
    </div>
  );
}

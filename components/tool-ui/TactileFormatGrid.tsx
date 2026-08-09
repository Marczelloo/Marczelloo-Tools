// components/tool-ui/TactileFormatGrid.tsx
"use client";

export interface FormatOption {
  value: string;
  label: string;
  desc: string;
}

interface SingleSelectProps {
  options: readonly FormatOption[];
  value: string;
  values?: never;
  onChange: (value: string) => void;
  multiple?: false;
  columns?: 2 | 3 | 4 | 5;
}

interface MultiSelectProps {
  options: readonly FormatOption[];
  value?: never;
  values: readonly string[];
  onChange: (values: string[]) => void;
  multiple: true;
  columns?: 2 | 3 | 4 | 5;
}

type TactileFormatGridProps = SingleSelectProps | MultiSelectProps;

export function TactileFormatGrid({
  options,
  value,
  values,
  onChange,
  multiple = false,
  columns = 3,
}: TactileFormatGridProps): React.JSX.Element {
  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : columns === 4
          ? "grid-cols-4"
          : "grid-cols-5";

  return (
    <div
      className={`grid ${gridCols} gap-2`}
      role={multiple ? "group" : "radiogroup"}
      aria-label="Format selection"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            if (multiple) {
              const currentValues = values ?? [];
              const nextValues = currentValues.includes(option.value)
                ? currentValues.filter((item) => item !== option.value)
                : [...currentValues, option.value];
              (onChange as (values: string[]) => void)(nextValues);
              return;
            }

            (onChange as (value: string) => void)(option.value);
          }}
          role={multiple ? "checkbox" : "radio"}
          aria-checked={multiple ? values?.includes(option.value) : value === option.value}
          className={`px-4 py-3 rounded-md text-sm transition-all duration-150 focus:ring-2 focus:ring-white/20 focus:outline-none focus-visible:ring-2 ${
            (multiple ? values?.includes(option.value) : value === option.value)
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

"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// GRID GENERATOR COMPONENT
// ============================================================================

function GridGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();
  const [gridStyles, setGridStyles] = useState({
    columns: 3,
    rows: 2,
    columnGap: 16,
    rowGap: 16,
    gridTemplateColumns: "" as string,
    gridTemplateRows: "" as string,
    justifyContent: "stretch" as const,
    alignContent: "stretch" as const,
    alignItems: "stretch" as const,
    justifyItems: "stretch" as const,
  });

  const [itemCount, setItemCount] = useState(6);
  const [copied, setCopied] = useState(false);

  const updateGridStyle = useCallback((key: keyof typeof gridStyles, value: string | number) => {
    setGridStyles(prev => ({ ...prev, [key]: value }));
  }, []);

  const generateCss = useCallback((): string => {
    const templateColumns = gridStyles.gridTemplateColumns ||
      `repeat(${gridStyles.columns}, 1fr)`;
    const templateRows = gridStyles.gridTemplateRows ||
      (gridStyles.rows > 0 ? `repeat(${gridStyles.rows}, 1fr)` : "auto");

    return `.grid-container {
  display: grid;
  grid-template-columns: ${templateColumns};
  ${gridStyles.rows > 0 || gridStyles.gridTemplateRows ? `grid-template-rows: ${templateRows};` : ""}
  column-gap: ${gridStyles.columnGap}px;
  row-gap: ${gridStyles.rowGap}px;
  justify-content: ${gridStyles.justifyContent};
  align-content: ${gridStyles.alignContent};
  align-items: ${gridStyles.alignItems};
  justify-items: ${gridStyles.justifyItems};
}

.grid-item {
  /* Your item styles here */
}`;
  }, [gridStyles]);

  const copyCss = useCallback(async () => {
    await navigator.clipboard.writeText(generateCss());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateCss]);

  const getTemplateColumns = (): string => {
    if (gridStyles.gridTemplateColumns) {
      return gridStyles.gridTemplateColumns;
    }
    return `repeat(${gridStyles.columns}, 1fr)`;
  };

  const colors = ["bg-accent-blue", "bg-accent-purple", "bg-accent-pink", "bg-accent-orange", "bg-accent-cyan", "bg-accent-green", "bg-accent-yellow", "bg-accent-red"];

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Grid Generator"}
        description="Create CSS Grid layouts"
        accent="cyan"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2">
              <Surface variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-content-primary">Preview</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-content-secondary">
                      Items:
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={itemCount}
                        onChange={(e) => setItemCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 bg-surface border border-border rounded text-content-primary text-center"
                      />
                    </label>
                  </div>
                </div>

                {/* Grid Container */}
                <div
                  className="min-h-[300px] p-4 bg-surface-muted rounded-lg border-2 border-dashed border-border"
                  style={{
                    display: "grid",
                    gridTemplateColumns: getTemplateColumns(),
                    gridTemplateRows: gridStyles.gridTemplateRows || (gridStyles.rows > 0 ? `repeat(${gridStyles.rows}, 1fr)` : undefined),
                    columnGap: `${gridStyles.columnGap}px`,
                    rowGap: `${gridStyles.rowGap}px`,
                    justifyContent: gridStyles.justifyContent,
                    alignContent: gridStyles.alignContent,
                    alignItems: gridStyles.alignItems,
                    justifyItems: gridStyles.justifyItems,
                  }}
                >
                  {Array.from({ length: itemCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-center text-background-primary font-bold text-lg rounded-lg min-h-[60px] ${colors[index % colors.length]}`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>

                {/* CSS Output */}
                <div className="mt-4 p-4 bg-surface-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                      CSS Code
                    </span>
                    <button
                      onClick={copyCss}
                      className={`px-3 py-1 text-xs rounded transition-colors-fast ${
                        copied
                          ? "bg-accent-green text-background-primary"
                          : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                      }`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="text-xs text-content-primary font-mono overflow-x-auto whitespace-pre">
                    {generateCss()}
                  </pre>
                </div>
              </Surface>
            </div>

            {/* Controls */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Grid Structure */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Grid Structure
                </h3>

                <div className="space-y-4">
                  {/* Columns */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Columns: {gridStyles.columns}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={gridStyles.columns}
                      onChange={(e) => updateGridStyle("columns", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Rows */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Rows: {gridStyles.rows} (0 = auto)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      value={gridStyles.rows}
                      onChange={(e) => updateGridStyle("rows", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Column Gap */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Column Gap: {gridStyles.columnGap}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={48}
                      value={gridStyles.columnGap}
                      onChange={(e) => updateGridStyle("columnGap", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Row Gap */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Row Gap: {gridStyles.rowGap}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={48}
                      value={gridStyles.rowGap}
                      onChange={(e) => updateGridStyle("rowGap", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Custom Template Columns */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Custom grid-template-columns
                    </label>
                    <input
                      type="text"
                      value={gridStyles.gridTemplateColumns}
                      onChange={(e) => updateGridStyle("gridTemplateColumns", e.target.value)}
                      placeholder="e.g., 200px 1fr 100px"
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs font-mono"
                    />
                    <p className="text-xs text-content-muted mt-1">Leave empty for repeat(columns, 1fr)</p>
                  </div>

                  {/* Custom Template Rows */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">
                      Custom grid-template-rows
                    </label>
                    <input
                      type="text"
                      value={gridStyles.gridTemplateRows}
                      onChange={(e) => updateGridStyle("gridTemplateRows", e.target.value)}
                      placeholder="e.g., 100px auto 100px"
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs font-mono"
                    />
                  </div>
                </div>
              </Surface>

              {/* Alignment */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Alignment
                </h3>

                <div className="space-y-3">
                  {/* Justify Content */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">justify-content</label>
                    <select
                      value={gridStyles.justifyContent}
                      onChange={(e) => updateGridStyle("justifyContent", e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="stretch">stretch</option>
                      <option value="start">start</option>
                      <option value="end">end</option>
                      <option value="center">center</option>
                      <option value="space-between">space-between</option>
                      <option value="space-around">space-around</option>
                      <option value="space-evenly">space-evenly</option>
                    </select>
                  </div>

                  {/* Align Content */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">align-content</label>
                    <select
                      value={gridStyles.alignContent}
                      onChange={(e) => updateGridStyle("alignContent", e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="stretch">stretch</option>
                      <option value="start">start</option>
                      <option value="end">end</option>
                      <option value="center">center</option>
                      <option value="space-between">space-between</option>
                      <option value="space-around">space-around</option>
                      <option value="space-evenly">space-evenly</option>
                    </select>
                  </div>

                  {/* Align Items */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">align-items</label>
                    <select
                      value={gridStyles.alignItems}
                      onChange={(e) => updateGridStyle("alignItems", e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="stretch">stretch</option>
                      <option value="start">start</option>
                      <option value="end">end</option>
                      <option value="center">center</option>
                      <option value="baseline">baseline</option>
                    </select>
                  </div>

                  {/* Justify Items */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">justify-items</label>
                    <select
                      value={gridStyles.justifyItems}
                      onChange={(e) => updateGridStyle("justifyItems", e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="stretch">stretch</option>
                      <option value="start">start</option>
                      <option value="end">end</option>
                      <option value="center">center</option>
                    </select>
                  </div>
                </div>
              </Surface>

              {/* Common Presets */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-3">
                  Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "2 Columns", cols: 2, rows: 0 },
                    { name: "3 Columns", cols: 3, rows: 0 },
                    { name: "4 Columns", cols: 4, rows: 0 },
                    { name: "Holy Grail", cols: 3, rows: 3, templateCols: "200px 1fr 200px", templateRows: "auto 1fr auto" },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        updateGridStyle("columns", preset.cols);
                        updateGridStyle("rows", preset.rows);
                        updateGridStyle("gridTemplateColumns", preset.templateCols || "");
                        updateGridStyle("gridTemplateRows", preset.templateRows || "");
                      }}
                      className="px-3 py-2 text-xs bg-surface border border-border rounded hover:border-accent-cyan hover:text-accent-cyan transition-colors-fast"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function GridGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "grid-generator",
    name: "Grid Generator",
    description: "Create CSS Grid layouts",
    category: "dev",
    accent: "cyan",
    layout: "live-playground",
    enabled: true,
    route: "/dev/grid-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <GridGeneratorInner />
    </ToolProvider>
  );
}

"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// FLEXBOX PLAYGROUND COMPONENT
// ============================================================================

function FlexboxPlaygroundInner(): React.JSX.Element {
  const { tool } = useTool();
  const [containerStyles, setContainerStyles] = useState({
    flexDirection: "row" as const,
    flexWrap: "nowrap" as const,
    justifyContent: "flex-start" as const,
    alignItems: "stretch" as const,
    alignContent: "stretch" as const,
    gap: 8,
  });

  const [items, setItems] = useState([
    { id: 1, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto", order: 0 },
    { id: 2, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto", order: 0 },
    { id: 3, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto", order: 0 },
  ]);

  const [copied, setCopied] = useState(false);

  const updateContainerStyle = useCallback((key: keyof typeof containerStyles, value: string | number) => {
    setContainerStyles(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateItem = useCallback((id: number, updates: Partial<typeof items[0]>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const addItem = useCallback(() => {
    const newId = Math.max(...items.map(i => i.id)) + 1;
    setItems(prev => [...prev, {
      id: newId,
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: "auto",
      alignSelf: "auto",
      order: 0,
    }]);
  }, [items]);

  const removeItem = useCallback((id: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [items]);

  const generateCss = useCallback((): string => {
    const container = `.flex-container {
  display: flex;
  flex-direction: ${containerStyles.flexDirection};
  flex-wrap: ${containerStyles.flexWrap};
  justify-content: ${containerStyles.justifyContent};
  align-items: ${containerStyles.alignItems};
  align-content: ${containerStyles.alignContent};
  gap: ${containerStyles.gap}px;
}`;

    const itemsCss = items.map((item, i) => {
      const lines = [];
      if (item.flexGrow !== 0) lines.push(`  flex-grow: ${item.flexGrow};`);
      if (item.flexShrink !== 1) lines.push(`  flex-shrink: ${item.flexShrink};`);
      if (item.flexBasis !== "auto") lines.push(`  flex-basis: ${item.flexBasis};`);
      if (item.alignSelf !== "auto") lines.push(`  align-self: ${item.alignSelf};`);
      if (item.order !== 0) lines.push(`  order: ${item.order};`);

      if (lines.length > 0) {
        return `.flex-item-${i + 1} {
${lines.join("\n")}
}`;
      }
      return null;
    }).filter(Boolean).join("\n\n");

    return container + (itemsCss ? `\n\n${itemsCss}` : "");
  }, [containerStyles, items]);

  const copyCss = useCallback(async () => {
    await navigator.clipboard.writeText(generateCss());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateCss]);

  const colors = ["bg-accent-blue", "bg-accent-purple", "bg-accent-pink", "bg-accent-orange", "bg-accent-cyan", "bg-accent-green"];

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Flexbox Playground"}
        description="Interactive flexbox learning tool"
        accent="green"
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
                  <button
                    onClick={addItem}
                    className="px-4 py-2 bg-accent-green text-background-primary text-sm font-medium rounded hover:opacity-90 transition-opacity"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Flex Container */}
                <div
                  className="min-h-[250px] p-4 bg-surface-muted rounded-lg border-2 border-dashed border-border"
                  style={{
                    display: "flex",
                    flexDirection: containerStyles.flexDirection,
                    flexWrap: containerStyles.flexWrap,
                    justifyContent: containerStyles.justifyContent,
                    alignItems: containerStyles.alignItems,
                    alignContent: containerStyles.alignContent,
                    gap: `${containerStyles.gap}px`,
                  }}
                >
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-center text-background-primary font-bold text-lg rounded-lg cursor-pointer transition-all hover:opacity-80 ${colors[index % colors.length]}`}
                      style={{
                        minWidth: "60px",
                        minHeight: "60px",
                        flexGrow: item.flexGrow,
                        flexShrink: item.flexShrink,
                        flexBasis: item.flexBasis,
                        alignSelf: item.alignSelf,
                        order: item.order,
                        width: item.flexBasis !== "auto" ? item.flexBasis : undefined,
                      }}
                      onClick={() => removeItem(item.id)}
                      title="Click to remove"
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
              {/* Container Properties */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Container Properties
                </h3>

                <div className="space-y-4">
                  {/* Flex Direction */}
                  <div>
                    <label className="text-xs text-content-secondary mb-2 block">flex-direction</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["row", "row-reverse", "column", "column-reverse"] as const).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => updateContainerStyle("flexDirection", dir)}
                          className={`px-2 py-1.5 text-xs rounded transition-colors-fast ${
                            containerStyles.flexDirection === dir
                              ? "bg-accent-green text-background-primary"
                              : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flex Wrap */}
                  <div>
                    <label className="text-xs text-content-secondary mb-2 block">flex-wrap</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["nowrap", "wrap", "wrap-reverse"] as const).map((wrap) => (
                        <button
                          key={wrap}
                          onClick={() => updateContainerStyle("flexWrap", wrap)}
                          className={`px-2 py-1.5 text-xs rounded transition-colors-fast ${
                            containerStyles.flexWrap === wrap
                              ? "bg-accent-green text-background-primary"
                              : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                          }`}
                        >
                          {wrap}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Justify Content */}
                  <div>
                    <label className="text-xs text-content-secondary mb-2 block">justify-content</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"] as const).map((jc) => (
                        <button
                          key={jc}
                          onClick={() => updateContainerStyle("justifyContent", jc)}
                          className={`px-2 py-1.5 text-xs rounded transition-colors-fast ${
                            containerStyles.justifyContent === jc
                              ? "bg-accent-green text-background-primary"
                              : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                          }`}
                        >
                          {jc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Align Items */}
                  <div>
                    <label className="text-xs text-content-secondary mb-2 block">align-items</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["stretch", "flex-start", "flex-end", "center", "baseline"] as const).map((ai) => (
                        <button
                          key={ai}
                          onClick={() => updateContainerStyle("alignItems", ai)}
                          className={`px-2 py-1.5 text-xs rounded transition-colors-fast ${
                            containerStyles.alignItems === ai
                              ? "bg-accent-green text-background-primary"
                              : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                          }`}
                        >
                          {ai}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gap */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">gap: {containerStyles.gap}px</label>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={containerStyles.gap}
                      onChange={(e) => updateContainerStyle("gap", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </Surface>

              {/* Item Properties */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Item Properties (Item 1)
                </h3>

                <div className="space-y-3">
                  {/* Flex Grow */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">flex-grow: {items[0]?.flexGrow}</label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={items[0]?.flexGrow ?? 0}
                      onChange={(e) => items[0] && updateItem(items[0].id, { flexGrow: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Flex Shrink */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">flex-shrink: {items[0]?.flexShrink}</label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={items[0]?.flexShrink ?? 1}
                      onChange={(e) => items[0] && updateItem(items[0].id, { flexShrink: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Flex Basis */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">flex-basis</label>
                    <select
                      value={items[0]?.flexBasis ?? "auto"}
                      onChange={(e) => items[0] && updateItem(items[0].id, { flexBasis: e.target.value })}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="auto">auto</option>
                      <option value="0">0</option>
                      <option value="100px">100px</option>
                      <option value="150px">150px</option>
                      <option value="200px">200px</option>
                      <option value="50%">50%</option>
                    </select>
                  </div>

                  {/* Align Self */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">align-self</label>
                    <select
                      value={items[0]?.alignSelf ?? "auto"}
                      onChange={(e) => items[0] && updateItem(items[0].id, { alignSelf: e.target.value })}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded text-content-primary text-xs"
                    >
                      <option value="auto">auto</option>
                      <option value="flex-start">flex-start</option>
                      <option value="flex-end">flex-end</option>
                      <option value="center">center</option>
                      <option value="stretch">stretch</option>
                      <option value="baseline">baseline</option>
                    </select>
                  </div>

                  {/* Order */}
                  <div>
                    <label className="text-xs text-content-secondary mb-1 block">order: {items[0]?.order}</label>
                    <input
                      type="range"
                      min={-2}
                      max={2}
                      step={1}
                      value={items[0]?.order ?? 0}
                      onChange={(e) => items[0] && updateItem(items[0].id, { order: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
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

export default function FlexboxPlaygroundPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "flexbox-playground",
    name: "Flexbox Playground",
    description: "Interactive flexbox learning tool",
    category: "dev",
    accent: "green",
    layout: "live-playground",
    enabled: true,
    route: "/dev/flexbox-playground",
  };

  return (
    <ToolProvider tool={tool}>
      <FlexboxPlaygroundInner />
    </ToolProvider>
  );
}

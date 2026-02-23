"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

// ============================================================================
// JSON FORMATTER COMPONENT
// ============================================================================

function JsonFormatterInner(): React.JSX.Element {
  const { tool } = useTool();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonError | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);

  const formatJson = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);

      // Sort keys if enabled
      const dataToFormat = sortKeys
        ? sortObjectKeys(parsed)
        : parsed;

      const formatted = JSON.stringify(dataToFormat, null, indent);
      setOutput(formatted);
      setError(null);
    } catch (e) {
      const err = e as Error;
      const match = err.message.match(/at position (\d+)/);
      const position = match?.[1] ? parseInt(match[1], 10) : 0;

      // Calculate line and column from position
      let line = 1;
      let column = 1;
      for (let i = 0; i < position && i < input.length; i++) {
        const char = input[i];
        if (char === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
      }

      setError({
        message: err.message,
        line,
        column,
      });
      setOutput("");
    }
  }, [input, indent, sortKeys]);

  const minifyJson = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
    } catch (e) {
      const err = e as Error;
      setError({ message: err.message });
      setOutput("");
    }
  }, [input]);

  const copyOutput = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  }, [output]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  const loadSample = useCallback(() => {
    const sample = {
      name: "JSON Formatter",
      version: "1.0.0",
      features: ["format", "minify", "validate", "sort-keys"],
      config: {
        indent: 2,
        sortKeys: false,
      },
      items: [
        { id: 1, label: "First" },
        { id: 2, label: "Second" },
        { id: 3, label: "Third" },
      ],
    };
    setInput(JSON.stringify(sample));
    setOutput("");
    setError(null);
  }, []);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      {/* Page Header */}
      <PageHeader
        title={tool?.name ?? "JSON Formatter"}
        description="Format, validate, and transform JSON data in real-time"
        accent="emerald"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-border">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
            <label className="flex items-center gap-2 text-sm text-content-secondary">
              <span>Indent:</span>
              <select
                value={indent}
                onChange={(e) => setIndent(parseInt(e.target.value, 10))}
                className="bg-surface border border-border rounded px-2 py-1 text-content-primary"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="1">1 tab</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="rounded border-border"
              />
              <span>Sort keys</span>
            </label>

            <div className="flex-1" />

            <button
              onClick={loadSample}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary transition-colors-fast"
            >
              Sample
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary transition-colors-fast"
            >
              Clear
            </button>
          </div>

          {/* Input Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Input JSON
            </span>
          </div>

          {/* Input Textarea */}
          <div className="flex-1 min-h-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='{\n  "key": "value"\n}'
              className="w-full h-full p-4 bg-transparent text-content-primary font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
            <button
              onClick={formatJson}
              className="px-4 py-1.5 bg-accent-emerald text-background-primary text-sm font-medium rounded hover:opacity-90 transition-opacity"
            >
              Format
            </button>
            <button
              onClick={minifyJson}
              className="px-4 py-1.5 bg-surface border border-border text-content-primary text-sm font-medium rounded hover:bg-interactive-hover transition-colors-fast"
            >
              Minify
            </button>

            <div className="flex-1" />

            <button
              onClick={copyOutput}
              disabled={!output}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors-fast"
            >
              Copy
            </button>
          </div>

          {/* Output Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Output
            </span>
            {output && (
              <span className="text-xs text-content-tertiary">
                {output.length} characters
              </span>
            )}
          </div>

          {/* Output / Error */}
          <div className="flex-1 min-h-0 overflow-auto">
            {error ? (
              <div className="p-4">
                <div className="p-4 bg-accent-red-muted border border-accent-red rounded">
                  <p className="text-accent-red font-medium">Invalid JSON</p>
                  <p className="text-sm text-content-secondary mt-1">
                    {error.message}
                  </p>
                  {error.line && (
                    <p className="text-xs text-content-tertiary mt-2">
                      Line {error.line}, Column {error.column}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <pre className="w-full h-full p-4 text-content-primary font-mono text-sm whitespace-pre-wrap break-words">
                {output || <span className="text-content-muted">Output will appear here...</span>}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: SORT OBJECT KEYS
// ============================================================================

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function JsonFormatterPage(): React.JSX.Element {
  // Tool config (normally from getToolById)
  const tool: ToolDefinition = {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON data",
    category: "dev",
    accent: "emerald",
    layout: "live-playground",
    enabled: true,
    route: "/dev/json-formatter",
  };

  return (
    <ToolProvider tool={tool}>
      <JsonFormatterInner />
    </ToolProvider>
  );
}

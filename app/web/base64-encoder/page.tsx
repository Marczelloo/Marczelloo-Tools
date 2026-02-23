"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// BASE64 ENCODER/DECODER COMPONENT
// ============================================================================

function Base64EncoderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const process = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      if (mode === "encode") {
        // Encode text to Base64
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
        setError(null);
      } else {
        // Decode Base64 to text
        const decoded = decodeURIComponent(escape(atob(input.trim())));
        setOutput(decoded);
        setError(null);
      }
    } catch {
      setError(mode === "encode" ? "Failed to encode text" : "Invalid Base64 string");
      setOutput("");
    }
  }, [input, mode]);

  const copyOutput = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const swapInputOutput = useCallback(() => {
    if (output) {
      setInput(output);
      setOutput(input);
      setMode(mode === "encode" ? "decode" : "encode");
      setError(null);
    }
  }, [input, output, mode]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  const loadSample = useCallback(() => {
    setInput("Hello, World! This is a test string for Base64 encoding.");
    setOutput("");
    setError(null);
  }, []);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader
        title={tool?.name ?? "Base64 Encoder"}
        description="Encode and decode Base64 strings"
        accent="yellow"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-border">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
            {/* Mode Toggle */}
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => setMode("encode")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors-fast ${
                  mode === "encode"
                    ? "bg-accent-yellow text-background-primary"
                    : "bg-surface text-content-secondary hover:bg-interactive-hover"
                }`}
              >
                Encode
              </button>
              <button
                onClick={() => setMode("decode")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors-fast ${
                  mode === "decode"
                    ? "bg-accent-yellow text-background-primary"
                    : "bg-surface text-content-secondary hover:bg-interactive-hover"
                }`}
              >
                Decode
              </button>
            </div>

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
              {mode === "encode" ? "Plain Text" : "Base64 String"}
            </span>
          </div>

          {/* Input Textarea */}
          <div className="flex-1 min-h-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
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
              onClick={process}
              disabled={!input.trim()}
              className="px-4 py-1.5 bg-accent-yellow text-background-primary text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {mode === "encode" ? "Encode" : "Decode"}
            </button>

            <button
              onClick={swapInputOutput}
              disabled={!output}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors-fast"
            >
              Swap
            </button>

            <div className="flex-1" />

            <button
              onClick={copyOutput}
              disabled={!output}
              className={`px-3 py-1.5 text-sm transition-colors-fast ${
                copied
                  ? "text-accent-green"
                  : "text-content-secondary hover:text-content-primary disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Output Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              {mode === "encode" ? "Base64 Output" : "Decoded Text"}
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
                  <p className="text-accent-red font-medium">Error</p>
                  <p className="text-sm text-content-secondary mt-1">{error}</p>
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
// PAGE COMPONENT
// ============================================================================

export default function Base64EncoderPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 strings",
    category: "web",
    accent: "yellow",
    layout: "split-panel",
    enabled: true,
    route: "/web/base64-encoder",
  };

  return (
    <ToolProvider tool={tool}>
      <Base64EncoderInner />
    </ToolProvider>
  );
}

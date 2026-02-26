"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// REGEX TESTER COMPONENT
// ============================================================================

function RegexTesterInner(): React.JSX.Element {
  const { tool } = useTool();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("gm");
  const [testString, setTestString] = useState("");
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const availableFlags = [
    { flag: "g", name: "Global", description: "Find all matches" },
    { flag: "m", name: "Multiline", description: "^ and $ match line boundaries" },
    { flag: "i", name: "Case Insensitive", description: "Ignore case" },
    { flag: "s", name: "Dotall", description: ". matches newlines" },
  ];

  const toggleFlag = useCallback((flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.replace(flag, "") : prev + flag));
  }, []);

  const testRegex = useCallback(() => {
    if (!pattern || !testString) {
      setMatches([]);
      setHighlightedText(testString);
      setError(null);
      return;
    }

    try {
      const allMatches: RegExpMatchArray[] = [];

      // Get all matches
      let match;
      const globalRegex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
      while ((match = globalRegex.exec(testString)) !== null) {
        allMatches.push(match);
        if (match[0] === "") {
          globalRegex.lastIndex++;
        }
      }

      setMatches(allMatches);
      setError(null);

      // Create highlighted text
      let highlighted = testString;
      if (allMatches.length > 0) {
        // Build highlighted version from end to start to preserve indices
        const parts: { text: string; isMatch: boolean; index: number }[] = [];
        let lastIndex = 0;

        for (const m of allMatches) {
          if (m.index !== undefined) {
            if (m.index > lastIndex) {
              parts.push({
                text: testString.slice(lastIndex, m.index),
                isMatch: false,
                index: lastIndex,
              });
            }
            parts.push({
              text: m[0],
              isMatch: true,
              index: m.index,
            });
            lastIndex = m.index + m[0].length;
          }
        }

        if (lastIndex < testString.length) {
          parts.push({
            text: testString.slice(lastIndex),
            isMatch: false,
            index: lastIndex,
          });
        }

        highlighted = parts
          .map((p) =>
            p.isMatch
              ? `<mark class="bg-accent-green text-background-primary rounded px-0.5">${escapeHtml(p.text)}</mark>`
              : escapeHtml(p.text)
          )
          .join("");
      }

      setHighlightedText(highlighted);
    } catch (e) {
      const err = e as Error;
      setError(err.message);
      setMatches([]);
      setHighlightedText(escapeHtml(testString));
    }
  }, [pattern, flags, testString]);

  // Auto-test on changes
  useEffect(() => {
    const timer = setTimeout(testRegex, 200);
    return () => clearTimeout(timer);
  }, [testRegex]);

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");
  };

  const copyRegex = useCallback(async () => {
    const regexString = `/${pattern}/${flags}`;
    await navigator.clipboard.writeText(regexString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pattern, flags]);

  const loadSample = useCallback(() => {
    setPattern("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
    setFlags("gi");
    setTestString(
      "Contact us at support@example.com or sales@company.org.\nFor more info, email info@domain.co.uk.\nInvalid: not.an.email@ or @missing.com"
    );
  }, []);

  const clearAll = useCallback(() => {
    setPattern("");
    setTestString("");
    setMatches([]);
    setHighlightedText("");
    setError(null);
  }, []);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader
        title={tool?.name ?? "Regex Tester"}
        description="Test regular expressions in real-time"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-white/10">
          {/* Regex Input */}
          <div className="flex-shrink-0 p-4 border-b border-white/10 bg-zinc-950">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center bg-black border border-white/10 rounded-md overflow-hidden">
                <span className="text-zinc-500 px-2">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Enter regex pattern"
                  className="flex-1 px-2 py-2 bg-transparent text-white font-mono text-sm focus:outline-none"
                />
                <span className="text-zinc-500 px-2">/</span>
                <input
                  type="text"
                  value={flags}
                  onChange={(e) => setFlags(e.target.value)}
                  className="w-16 px-2 py-2 bg-transparent text-white font-mono text-sm border-l border-white/10 focus:outline-none"
                />
              </div>
              <button
                onClick={copyRegex}
                disabled={!pattern}
                className={`px-3 py-2 text-sm rounded border border-white/10 transition-colors ${
                  copied
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 hover:bg-white/5 disabled:opacity-50"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {availableFlags.map((f) => (
                <button
                  key={f.flag}
                  onClick={() => toggleFlag(f.flag)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    flags.includes(f.flag)
                      ? "bg-white text-black"
                      : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                  title={f.description}
                >
                  <span className="font-mono font-bold">{f.flag}</span>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/10">
            <button
              onClick={loadSample}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sample
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Test String Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              Test String
            </span>
          </div>

          {/* Test String Textarea */}
          <div className="flex-1 min-h-0">
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter text to test against..."
              className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          {/* Error Display */}
          {error ? (
            <div className="p-4 border-b border-white/10">
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded">
                <p className="text-zinc-300 font-medium">Invalid Regex</p>
                <p className="text-sm text-zinc-400 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Matches Summary */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    {matches.length} match{matches.length !== 1 ? "es" : ""} found
                  </span>
                  {matches.length > 0 && (
                    <span className="text-xs text-zinc-500 font-mono">
                      {matches.reduce((acc, m) => acc + m[0].length, 0)} characters matched
                    </span>
                  )}
                </div>
              </div>

              {/* Highlighted Text */}
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="p-4">
                  {testString ? (
                    <div
                      className="font-mono text-sm whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: highlightedText }}
                    />
                  ) : (
                    <p className="text-zinc-500">Enter a test string to see matches</p>
                  )}
                </div>
              </div>

              {/* Match Details */}
              {matches.length > 0 && (
                <div className="flex-shrink-0 max-h-48 border-t border-white/10 overflow-auto">
                  <div className="px-4 py-2 bg-zinc-950">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Match Details
                    </span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {matches.slice(0, 10).map((match, index) => (
                      <div key={index} className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">#{index + 1}</span>
                          <code className="text-white font-mono bg-zinc-900 px-1 rounded">
                            {match[0]}
                          </code>
                          <span className="text-xs text-zinc-600">
                            at position {match.index}
                          </span>
                        </div>
                        {match.length > 1 && (
                          <div className="mt-1 ml-6 text-xs text-zinc-600">
                            Groups: {match.slice(1).map((g, i) => `[${i + 1}]: ${g}`).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                    {matches.length > 10 && (
                      <div className="px-4 py-2 text-sm text-zinc-500 text-center">
                        +{matches.length - 10} more matches
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function RegexTesterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/regex-tester",
  };

  return (
    <ToolProvider tool={tool}>
      <RegexTesterInner />
    </ToolProvider>
  );
}

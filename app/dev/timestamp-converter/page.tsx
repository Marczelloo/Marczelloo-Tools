"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function parseTimestamp(input: string): Date | null {
  const trimmed = input.trim();

  // Try Unix timestamp (seconds)
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && trimmed.length >= 9 && trimmed.length <= 11) {
    return new Date(seconds * 1000);
  }

  // Try milliseconds timestamp
  if (!isNaN(seconds) && trimmed.length >= 12 && trimmed.length <= 14) {
    return new Date(seconds);
  }

  // Try ISO string
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return null;
}

// ============================================================================
// TIMESTAMP CONVERTER COMPONENT
// ============================================================================

function TimestampConverterInner(): React.JSX.Element {
  const { tool } = useTool();
  const [currentTab, setCurrentTab] = useState<"timestamp" | "date">("timestamp");
  const [timestampInput, setTimestampInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [result, setResult] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const convertTimestamp = useCallback(() => {
    if (!timestampInput.trim()) {
      setError("Please enter a timestamp");
      setResult(null);
      return;
    }

    const date = parseTimestamp(timestampInput);
    if (date) {
      setResult(date);
      setError(null);
    } else {
      setError("Invalid timestamp format");
      setResult(null);
    }
  }, [timestampInput]);

  const convertDate = useCallback(() => {
    if (!dateInput) {
      setError("Please select a date");
      setResult(null);
      return;
    }

    const dateTimeString = timeInput
      ? `${dateInput}T${timeInput}`
      : `${dateInput}T00:00:00`;

    const date = new Date(dateTimeString);
    if (!isNaN(date.getTime())) {
      setResult(date);
      setError(null);
    } else {
      setError("Invalid date");
      setResult(null);
    }
  }, [dateInput, timeInput]);

  const useCurrentTime = useCallback(() => {
    const now = new Date();
    setTimestampInput(Math.floor(now.getTime() / 1000).toString());
    setResult(now);
    setError(null);
    setCurrentTab("timestamp");
  }, []);

  const copyToClipboard = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Timestamp Converter"}
        description="Convert between Unix timestamps and human-readable dates"
        accent="yellow"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          {/* Current Time Display */}
          <Surface variant="elevated" padding="md" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-content-muted uppercase tracking-wider">Current Time</p>
                <p className="text-2xl font-mono text-accent-yellow mt-1">
                  {Math.floor(currentTime.getTime() / 1000)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-content-muted uppercase tracking-wider">Local</p>
                <p className="text-sm text-content-secondary mt-1">
                  {formatDateTime(currentTime)}
                </p>
              </div>
              <button
                onClick={useCurrentTime}
                className="px-4 py-2 bg-accent-yellow text-background-primary text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                Use Now
              </button>
            </div>
          </Surface>

          <Surface variant="elevated" padding="lg">
            {/* Tab Selector */}
            <div className="flex mb-6 border-b border-border">
              <button
                onClick={() => setCurrentTab("timestamp")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors-fast ${
                  currentTab === "timestamp"
                    ? "border-accent-yellow text-accent-yellow"
                    : "border-transparent text-content-secondary hover:text-content-primary"
                }`}
              >
                Timestamp to Date
              </button>
              <button
                onClick={() => setCurrentTab("date")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors-fast ${
                  currentTab === "date"
                    ? "border-accent-yellow text-accent-yellow"
                    : "border-transparent text-content-secondary hover:text-content-primary"
                }`}
              >
                Date to Timestamp
              </button>
            </div>

            {/* Timestamp Input */}
            {currentTab === "timestamp" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Unix Timestamp (seconds or milliseconds)
                  </label>
                  <input
                    type="text"
                    value={timestampInput}
                    onChange={(e) => setTimestampInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && convertTimestamp()}
                    placeholder="e.g., 1704067200"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary font-mono"
                  />
                </div>
                <button
                  onClick={convertTimestamp}
                  className="w-full px-6 py-3 bg-accent-yellow text-background-primary font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  Convert
                </button>
              </div>
            )}

            {/* Date Input */}
            {currentTab === "date" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Time (optional)
                    </label>
                    <input
                      type="time"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      step="1"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                    />
                  </div>
                </div>
                <button
                  onClick={convertDate}
                  className="w-full px-6 py-3 bg-accent-yellow text-background-primary font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  Convert
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-accent-red-muted border border-accent-red rounded-md">
                <p className="text-accent-red text-sm">{error}</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
                  Conversion Results
                </h3>

                <div className="bg-surface-muted rounded-md divide-y divide-border">
                  {/* Unix Seconds */}
                  <div className="flex items-center justify-between px-4 py-3 group">
                    <div>
                      <p className="text-xs text-content-muted">Unix Timestamp (seconds)</p>
                      <p className="font-mono text-content-primary">
                        {Math.floor(result.getTime() / 1000)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(Math.floor(result.getTime() / 1000).toString())}
                      className="px-3 py-1 text-xs bg-surface border border-border text-content-secondary rounded hover:bg-interactive-hover opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Milliseconds */}
                  <div className="flex items-center justify-between px-4 py-3 group">
                    <div>
                      <p className="text-xs text-content-muted">Unix Timestamp (milliseconds)</p>
                      <p className="font-mono text-content-primary">
                        {result.getTime()}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.getTime().toString())}
                      className="px-3 py-1 text-xs bg-surface border border-border text-content-secondary rounded hover:bg-interactive-hover opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>

                  {/* ISO 8601 */}
                  <div className="flex items-center justify-between px-4 py-3 group">
                    <div>
                      <p className="text-xs text-content-muted">ISO 8601</p>
                      <p className="font-mono text-content-primary text-sm">
                        {result.toISOString()}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.toISOString())}
                      className="px-3 py-1 text-xs bg-surface border border-border text-content-secondary rounded hover:bg-interactive-hover opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Local Time */}
                  <div className="flex items-center justify-between px-4 py-3 group">
                    <div>
                      <p className="text-xs text-content-muted">Local Time</p>
                      <p className="text-content-primary">
                        {formatDateTime(result)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(formatDateTime(result))}
                      className="px-3 py-1 text-xs bg-surface border border-border text-content-secondary rounded hover:bg-interactive-hover opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>

                  {/* UTC */}
                  <div className="flex items-center justify-between px-4 py-3 group">
                    <div>
                      <p className="text-xs text-content-muted">UTC</p>
                      <p className="text-content-primary">
                        {result.toUTCString()}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.toUTCString())}
                      className="px-3 py-1 text-xs bg-surface border border-border text-content-secondary rounded hover:bg-interactive-hover opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Surface>
        </Container>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function TimestampConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between timestamps and dates",
    category: "dev",
    accent: "yellow",
    layout: "form-heavy",
    enabled: true,
    route: "/dev/timestamp-converter",
  };

  return (
    <ToolProvider tool={tool}>
      <TimestampConverterInner />
    </ToolProvider>
  );
}

"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// META TAG PREVIEW COMPONENT
// ============================================================================

function MetaPreviewInner(): React.JSX.Element {
  const { tool } = useTool();
  const [meta, setMeta] = useState({
    title: "Marczelloo Tools - Free Online Utility Platform",
    description: "Free online tools for video compression, image conversion, PDF editing, and more. Fast, secure, and easy to use.",
    url: "https://tools.marczelloo.dev",
    image: "https://tools.marczelloo.dev/og-image.png",
    siteName: "Marczelloo Tools",
    twitterHandle: "@marczelloo",
  });
  const [copied, setCopied] = useState(false);

  const updateMeta = useCallback((key: keyof typeof meta, value: string) => {
    setMeta(prev => ({ ...prev, [key]: value }));
  }, []);

  const generateHtml = useCallback((): string => {
    return `<!-- Primary Meta Tags -->
<title>${meta.title}</title>
<meta name="title" content="${meta.title}">
<meta name="description" content="${meta.description}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${meta.url}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:image" content="${meta.image}">
<meta property="og:site_name" content="${meta.siteName}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${meta.url}">
<meta property="twitter:title" content="${meta.title}">
<meta property="twitter:description" content="${meta.description}">
<meta property="twitter:image" content="${meta.image}">
${meta.twitterHandle ? `<meta property="twitter:site" content="${meta.twitterHandle}">` : ""}`;
  }, [meta]);

  const copyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(generateHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateHtml]);

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Meta Tag Preview"}
        description="Preview social media link previews"
        accent="blue"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Surface variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-content-primary mb-4">Meta Tags</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Title
                    <span className={`float-right ${meta.title.length > 60 ? "text-accent-red" : "text-content-muted"}`}>
                      {meta.title.length}/60
                    </span>
                  </label>
                  <input
                    type="text"
                    value={meta.title}
                    onChange={(e) => updateMeta("title", e.target.value)}
                    placeholder="Page title"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Description
                    <span className={`float-right ${meta.description.length > 160 ? "text-accent-red" : "text-content-muted"}`}>
                      {meta.description.length}/160
                    </span>
                  </label>
                  <textarea
                    value={meta.description}
                    onChange={(e) => updateMeta("description", e.target.value)}
                    placeholder="Page description"
                    rows={3}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary resize-none"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={meta.url}
                    onChange={(e) => updateMeta("url", e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Image URL (1200x630 recommended)
                  </label>
                  <input
                    type="url"
                    value={meta.image}
                    onChange={(e) => updateMeta("image", e.target.value)}
                    placeholder="https://example.com/og-image.png"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>

                {/* Site Name */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={meta.siteName}
                    onChange={(e) => updateMeta("siteName", e.target.value)}
                    placeholder="Your Site"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>

                {/* Twitter Handle */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Twitter Handle (optional)
                  </label>
                  <input
                    type="text"
                    value={meta.twitterHandle}
                    onChange={(e) => updateMeta("twitterHandle", e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>
              </div>
            </Surface>

            {/* Previews */}
            <div className="space-y-6">
              {/* Twitter Preview */}
              <Surface variant="elevated" padding="lg">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Twitter Card Preview
                </h3>

                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  {meta.image && (
                    <div className="aspect-[2/1] bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 bg-gray-900">
                    <p className="text-xs text-gray-400 mb-1">
                      {meta.url.replace(/^https?:\/\//, "").split("/")[0]}
                    </p>
                    <h4 className="text-sm font-medium text-white mb-1">
                      {truncateText(meta.title, 70)}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {truncateText(meta.description, 120)}
                    </p>
                  </div>
                </div>
              </Surface>

              {/* Facebook/LinkedIn Preview */}
              <Surface variant="elevated" padding="lg">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-4">
                  Facebook / LinkedIn Preview
                </h3>

                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {meta.image && (
                    <div className="aspect-[1.91/1] bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 bg-gray-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      {meta.url.replace(/^https?:\/\//, "").split("/")[0]}
                    </p>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {truncateText(meta.title, 100)}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {truncateText(meta.description, 200)}
                    </p>
                  </div>
                </div>
              </Surface>

              {/* Generated HTML */}
              <Surface variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
                    Generated HTML
                  </h3>
                  <button
                    onClick={copyHtml}
                    className={`px-3 py-1 text-xs rounded transition-colors-fast ${
                      copied
                        ? "bg-accent-green text-background-primary"
                        : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <pre className="p-4 bg-surface-muted rounded-md text-xs text-content-primary font-mono overflow-x-auto whitespace-pre max-h-64 overflow-y-auto">
                  {generateHtml()}
                </pre>
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

export default function MetaPreviewPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "meta-preview",
    name: "Meta Tag Preview",
    description: "Preview social media link previews",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/dev/meta-preview",
  };

  return (
    <ToolProvider tool={tool}>
      <MetaPreviewInner />
    </ToolProvider>
  );
}

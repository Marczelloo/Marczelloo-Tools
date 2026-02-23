/**
 * App Workspace - Native Desktop App Experience
 * Pure black, monochrome, no scrolling the page itself
 */

"use client";

import { useState, useCallback } from "react";
import {
  Film,
  Image,
  FileText,
  Globe,
  Code2,
  Settings,
  ChevronDown,
  Zap,
  Search,
  Bell,
  ArrowLeft,
  MoreHorizontal,
  Volume2,
  Scissors,
  FileVideo,
  FileAudio,
  Hash,
  Braces,
  Binary,
  Link2,
  QrCode,
  Calendar,
  Palette,
  Layers,
  Box,
  Grid3X3,
  Contrast,
  Eye,
  Clock,
  User,
} from "lucide-react";

// ============================================================================
// TOOLS CONFIGURATION
// ============================================================================

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: Tool[];
}

const categories: Category[] = [
  {
    id: "media",
    name: "Media",
    icon: Film,
    tools: [
      {
        id: "video-compressor",
        name: "Video Compressor",
        description: "Compress videos with custom quality",
        icon: FileVideo,
        category: "media",
      },
      {
        id: "audio-extractor",
        name: "Audio Extractor",
        description: "Extract audio from video files",
        icon: Volume2,
        category: "media",
      },
      {
        id: "video-trimmer",
        name: "Video Trimmer",
        description: "Trim and cut video clips",
        icon: Scissors,
        category: "media",
      },
      {
        id: "audio-compressor",
        name: "Audio Compressor",
        description: "Compress audio files",
        icon: FileAudio,
        category: "media",
      },
    ],
  },
  {
    id: "image",
    name: "Image",
    icon: Image,
    tools: [
      {
        id: "png-webp",
        name: "PNG ↔ WebP",
        description: "Convert between PNG and WebP",
        icon: Contrast,
        category: "image",
      },
      {
        id: "image-compressor",
        name: "Image Compressor",
        description: "Compress images without quality loss",
        icon: Layers,
        category: "image",
      },
      {
        id: "background-remover",
        name: "Background Remover",
        description: "Remove image backgrounds",
        icon: Eye,
        category: "image",
      },
    ],
  },
  {
    id: "document",
    name: "Document",
    icon: FileText,
    tools: [
      {
        id: "pdf-merge",
        name: "PDF Merge",
        description: "Combine multiple PDFs",
        icon: FileText,
        category: "document",
      },
      {
        id: "pdf-split",
        name: "PDF Split",
        description: "Split PDF into pages",
        icon: Scissors,
        category: "document",
      },
      {
        id: "ocr",
        name: "OCR",
        description: "Extract text from images",
        icon: Eye,
        category: "document",
      },
    ],
  },
  {
    id: "web",
    name: "Web",
    icon: Globe,
    tools: [
      {
        id: "json-formatter",
        name: "JSON Formatter",
        description: "Format and validate JSON",
        icon: Braces,
        category: "web",
      },
      {
        id: "hash-generator",
        name: "Hash Generator",
        description: "Generate MD5, SHA hashes",
        icon: Hash,
        category: "web",
      },
      {
        id: "base64-encoder",
        name: "Base64 Encoder",
        description: "Encode and decode Base64",
        icon: Binary,
        category: "web",
      },
      {
        id: "url-downloader",
        name: "URL Downloader",
        description: "Download media from URLs",
        icon: Link2,
        category: "web",
      },
      {
        id: "qr-generator",
        name: "QR Generator",
        description: "Generate QR codes",
        icon: QrCode,
        category: "web",
      },
    ],
  },
  {
    id: "dev",
    name: "Dev",
    icon: Code2,
    tools: [
      {
        id: "uuid-generator",
        name: "UUID Generator",
        description: "Generate unique IDs",
        icon: Zap,
        category: "dev",
      },
      {
        id: "jwt-decoder",
        name: "JWT Decoder",
        description: "Decode JWT tokens",
        icon: Binary,
        category: "dev",
      },
      {
        id: "timestamp-converter",
        name: "Timestamp Converter",
        description: "Convert timestamps",
        icon: Calendar,
        category: "dev",
      },
      {
        id: "color-palette",
        name: "Color Palette",
        description: "Generate color palettes",
        icon: Palette,
        category: "dev",
      },
      {
        id: "css-gradient",
        name: "CSS Gradient",
        description: "Create CSS gradients",
        icon: Layers,
        category: "dev",
      },
      {
        id: "box-shadow",
        name: "Box Shadow",
        description: "Generate box shadows",
        icon: Box,
        category: "dev",
      },
      {
        id: "flexbox",
        name: "Flexbox Playground",
        description: "Learn CSS flexbox",
        icon: Grid3X3,
        category: "dev",
      },
    ],
  },
];

// Flatten tools for easy lookup
const allTools = categories.flatMap((c) => c.tools);
const getTool = (id: string) => allTools.find((t) => t.id === id);

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

interface SidebarProps {
  activeTool: string;
  onSelectTool: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function Sidebar({ activeTool, onSelectTool, collapsed }: SidebarProps): React.JSX.Element {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  return (
    <aside
      className={`w-64 flex-shrink-0 bg-black border-r border-white/10 flex flex-col
        transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}
    >
      {/* Logo / Brand */}
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-black" />
        </div>
        {!collapsed && <span className="ml-3 text-sm font-medium text-white">Tools</span>}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tools..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
            <kbd className="text-xs text-zinc-600 bg-black px-1.5 py-0.5 rounded border border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Categories & Tools */}
      <nav className="flex-1 overflow-y-auto py-2">
        {categories.map((category) => (
          <div key={category.id} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono
                text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
            >
              <category.icon className="w-4 h-4" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{category.name}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      expandedCategories.has(category.id) ? "" : "-rotate-90"
                    }`}
                  />
                </>
              )}
            </button>

            {/* Tools List */}
            {!collapsed && expandedCategories.has(category.id) && (
              <div className="mt-1 space-0.5 px-2">
                {category.tools.map((tool) => {
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelectTool(tool.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        transition-all duration-150 ${
                          isActive
                            ? "bg-white/5 text-white border-l-2 border-white"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <tool.icon className="w-4 h-4" />
                      <span>{tool.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom User Section */}
      <div className="border-t border-white/10 p-3">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <div className="text-sm text-white">Guest</div>
              <div className="text-xs text-zinc-500">No account</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

// ============================================================================
// TOOL PLACEHOLDER COMPONENTS
// ============================================================================

function ToolPlaceholder({ tool }: { tool: Tool }): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <tool.icon className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{tool.name}</h3>
        <p className="text-zinc-500 mb-8">{tool.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 font-mono">
          <Clock className="w-3 h-3" />
          Coming soon
        </div>
      </div>
    </div>
  );
}

function VideoCompressorUI(): React.JSX.Element {
  const [processing, setProcessing] = useState(false);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Video Compressor</h2>
        <p className="text-zinc-500">Compress videos with custom quality settings</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-white/20 transition-colors cursor-pointer mb-6">
        <FileVideo className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
        <p className="text-white mb-2">Drop video file here</p>
        <p className="text-sm text-zinc-500">or click to browse • MP4, WebM, MOV</p>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
            Quality
          </label>
          <select className="w-full bg-black text-white rounded-lg px-3 py-2 border border-white/10">
            <option>Low (smallest)</option>
            <option selected>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
            Max Bitrate
          </label>
          <select className="w-full bg-black text-white rounded-lg px-3 py-2 border border-white/10">
            <option>2 Mbps</option>
            <option selected>5 Mbps</option>
            <option>10 Mbps</option>
          </select>
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={() => setProcessing(!processing)}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          processing ? "bg-zinc-800 text-zinc-400" : "bg-white text-black hover:bg-zinc-200"
        }`}
      >
        {processing ? "Processing..." : "Compress Video"}
      </button>
    </div>
  );
}

function JsonFormatterUI(): React.JSX.Element {
  const [input, setInput] = useState('{\n  "name": "example",\n  "value": 123\n}');
  const [output, setOutput] = useState("");

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch {
      setOutput("Invalid JSON");
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch {
      setOutput("Invalid JSON");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <button
          onClick={format}
          className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          Format
        </button>
        <button
          onClick={minify}
          className="px-4 py-2 text-zinc-400 border border-white/10 rounded-lg text-sm hover:text-white hover:bg-white/5 transition-colors"
        >
          Minify
        </button>
        <div className="flex-1" />
        <span className="text-xs text-zinc-600 font-mono">JSON</span>
      </div>

      {/* Editor Panels */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-white/10">
        {/* Input */}
        <div className="flex flex-col">
          <div className="px-4 py-2 border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wider">
            Input
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-4 bg-transparent text-white font-mono text-sm resize-none outline-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <div className="px-4 py-2 border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wider">
            Output
          </div>
          <pre className="flex-1 p-4 text-zinc-400 font-mono text-sm overflow-auto">
            {output || "Output will appear here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

function HashGeneratorUI(): React.JSX.Element {
  const [input, setInput] = useState("Hello World");

  const hashes = [
    { name: "MD5", value: "ed076287532e86365e841e92bfc50d8c" },
    { name: "SHA-1", value: "0a4d55a8d778e5022fab701977c5d840bbc486d0" },
    { name: "SHA-256", value: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e" },
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Hash Generator</h2>
        <p className="text-zinc-500">Generate cryptographic hashes for any text</p>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
          Input Text
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-32 p-4 bg-white/[0.02] border border-white/10 rounded-xl
            text-white font-mono text-sm resize-none outline-none focus:border-white/20"
          placeholder="Enter text to hash..."
        />
      </div>

      {/* Hashes */}
      <div className="space-y-4">
        {hashes.map((hash) => (
          <div key={hash.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 font-mono uppercase">{hash.name}</span>
              <button className="text-xs text-zinc-500 hover:text-white transition-colors">
                Copy
              </button>
            </div>
            <code className="text-sm text-white font-mono break-all">{hash.value}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TOOL RENDERER (Dynamic Component Selection)
// ============================================================================

function ToolContent({ toolId }: { toolId: string }): React.JSX.Element {
  const tool = getTool(toolId);

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">Tool not found</div>
    );
  }

  // Map tool IDs to their specific UI components
  const toolComponents: Record<string, React.ComponentType> = {
    "video-compressor": VideoCompressorUI,
    "json-formatter": JsonFormatterUI,
    "hash-generator": HashGeneratorUI,
  };

  const Component = toolComponents[toolId];

  if (Component) {
    return <Component />;
  }

  // Fallback to placeholder
  return <ToolPlaceholder tool={tool} />;
}

// ============================================================================
// MAIN APP WORKSPACE
// ============================================================================

export default function AppWorkspace(): React.JSX.Element {
  const [activeTool, setActiveTool] = useState("video-compressor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeToolData = getTool(activeTool);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-black text-white">
      {/* Sidebar */}
      <Sidebar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 flex-shrink-0 flex items-center px-4 border-b border-white/10 bg-zinc-900/50">
          {/* Back / Navigation */}
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Tool Name */}
          <div className="ml-4 flex items-center gap-3">
            {activeToolData && (
              <>
                <activeToolData.icon className="w-4 h-4 text-zinc-400" />
                <h1 className="text-sm font-medium text-white">{activeToolData.name}</h1>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-500">{activeToolData.description}</span>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Canvas (Scrollable) */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <ToolContent toolId={activeTool} />
        </main>
      </div>
    </div>
  );
}

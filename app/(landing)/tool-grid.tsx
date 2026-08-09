import { Container, Surface } from "@/components/layout";
import type { ToolDefinition, ToolCategory } from "@/lib/featureFlags";

interface LandingToolGridProps {
  tools: ToolDefinition[];
  categories: ToolCategory[];
}

const categoryLabels: Record<ToolCategory, string> = {
  media: "🎥 Media",
  image: "🖼️ Images",
  document: "📄 Documents",
  web: "🌐 Web Tools",
  dev: "🧑‍💻 Dev Tools",
};

const categoryIcons: Record<ToolCategory, string> = {
  media: "",
  image: "",
  document: "",
  web: "",
  dev: "",
};

const accentClasses: Record<string, string> = {
  blue: "text-accent-blue bg-accent-blue-muted",
  cyan: "text-accent-cyan bg-accent-cyan-muted",
  emerald: "text-accent-emerald bg-accent-emerald-muted",
  orange: "text-accent-orange bg-accent-orange-muted",
  green: "text-accent-green bg-accent-green-muted",
  pink: "text-accent-pink bg-accent-pink-muted",
  yellow: "text-accent-yellow bg-accent-yellow-muted",
  red: "text-accent-red bg-accent-red-muted",
  purple: "text-accent-purple bg-accent-purple-muted",
};

export function LandingToolGrid({
  tools,
  categories,
}: LandingToolGridProps): React.JSX.Element {
  // Group tools by category
  const toolsByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = tools.filter((t) => t.category === category);
      return acc;
    },
    {} as Record<ToolCategory, ToolDefinition[]>
  );

  return (
    <section id="tools" className="py-24">
      <Container size="lg">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-content-primary mb-4">
            Available Tools
          </h2>
          <p className="text-content-secondary max-w-2xl mx-auto">
            {tools.length === 0
              ? "More tools coming soon. Stay tuned!"
              : `${tools.length} tools ready to use.`}
          </p>
        </div>

        {/* Tool categories */}
        {tools.length > 0 ? (
          <div className="space-y-12">
            {categories.map((category) => {
              const categoryTools = toolsByCategory[category];
              if (!categoryTools || categoryTools.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{categoryIcons[category]}</span>
                    <h3 className="text-xl font-semibold text-content-primary">
                      {categoryLabels[category]}
                    </h3>
                    <span className="text-sm text-content-muted">
                      {categoryTools.length} tools
                    </span>
                  </div>

                  {/* Tools grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTools.map((tool) => (
                      <Surface
                        key={tool.id}
                        variant="default"
                        padding="md"
                        interactive
                        className="cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Accent indicator */}
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              accentClasses[tool.accent]?.split(" ")[0] ??
                              "text-accent-blue"
                            } bg-current`}
                            style={{
                              backgroundColor: `var(--accent-${tool.accent})`,
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-content-primary group-hover:text-accent-blue transition-colors-fast">
                              {tool.name}
                            </h4>
                            <p className="text-sm text-content-tertiary mt-1 line-clamp-2">
                              {tool.description}
                            </p>

                            {/* Layout badge */}
                            <span className="inline-block mt-3 px-2 py-0.5 text-xs text-content-muted bg-surface-muted rounded">
                              {tool.layout}
                            </span>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <Surface variant="muted" padding="lg" className="text-center">
            <p className="text-content-secondary mb-2">
              No tools are currently enabled
            </p>
            <p className="text-sm text-content-tertiary">
              Tools will appear here when enabled in feature flags
            </p>
          </Surface>
        )}

      </Container>
    </section>
  );
}

import { Container, Surface } from "@/components/layout";

const features = [
  {
    icon: "🔒",
    title: "Secure & Private",
    description:
      "Files processed locally, auto-deleted after 20 minutes. Your data never leaves your control.",
  },
  {
    icon: "⚡",
    title: "Lightning Fast",
    description:
      "Optimized processing with efficient resource usage. No waiting, no queue.",
  },
  {
    icon: "🎯",
    title: "Focused Experience",
    description:
      "No ads, no tracking, no distractions. Just clean utilities that work.",
  },
  {
    icon: "🛠️",
    title: "Modular Tools",
    description:
      "Video, audio, image, and developer tools. Pick what you need.",
  },
  {
    icon: "🌍",
    title: "Works Everywhere",
    description:
      "Browser-based, no installation required. Works on any device.",
  },
  {
    icon: "💡",
    title: "Modern Design",
    description:
      "Clean, dark-first interface designed for focus and productivity.",
  },
];

export function LandingFeatures(): React.JSX.Element {
  return (
    <section className="py-24 bg-background-secondary">
      <Container size="lg">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-content-primary mb-4">
            Built for Creators & Developers
          </h2>
          <p className="text-content-secondary max-w-2xl mx-auto">
            Everything you need to process media and data, all in one place.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Surface
              key={feature.title}
              variant="default"
              padding="lg"
              className="group"
            >
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-content-tertiary">
                {feature.description}
              </p>
            </Surface>
          ))}
        </div>
      </Container>
    </section>
  );
}

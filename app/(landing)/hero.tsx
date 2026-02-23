import { Container } from "@/components/layout";
import Link from "next/link";

export function LandingHero(): React.JSX.Element {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-blue-muted via-transparent to-transparent opacity-50" />

      <Container size="lg" className="relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border mb-8">
            <span className="text-sm text-content-secondary">
              🚀 Now in Beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-content-primary mb-6 leading-tight">
            Powerful Tools for
            <span className="text-accent-blue"> Developers</span>
            <br />
            and <span className="text-accent-cyan">Creators</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-content-secondary mb-10 max-w-2xl mx-auto">
            Fast, secure, and privacy-focused online utilities.
            Process files locally, auto-deleted after 20 minutes.
            No ads, no tracking.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="w-full sm:w-auto px-8 py-4 bg-accent-blue text-background-primary font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
            >
              Open App
            </Link>
            <a
              href="#tools"
              className="w-full sm:w-auto px-8 py-4 bg-surface border border-border text-content-primary font-medium rounded-lg hover:bg-interactive-hover transition-colors text-center"
            >
              Explore Tools
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-bold text-content-primary">7+</p>
              <p className="text-sm text-content-tertiary">Tools</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-content-primary">20</p>
              <p className="text-sm text-content-tertiary">Min Auto-Delete</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-content-primary">0</p>
              <p className="text-sm text-content-tertiary">Ads</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

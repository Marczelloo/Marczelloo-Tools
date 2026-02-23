"use client";

import { Container, Surface } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { landingFAQs } from "./faq-data";

export function LandingFAQ(): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-background-secondary">
      <Container size="md">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-content-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-content-secondary">
            Common questions about Marczelloo Tools
          </p>
        </div>

        {/* FAQ list */}
        <div className="space-y-4">
          {landingFAQs.map((faq, index) => (
            <Surface
              key={index}
              variant="default"
              padding="none"
              className="overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-interactive-hover transition-colors-fast"
              >
                <span className="font-medium text-content-primary">
                  {faq.question}
                </span>
                <span
                  className={cn(
                    "text-content-tertiary transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                >
                  ▼
                </span>
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  openIndex === index ? "max-h-40" : "max-h-0"
                )}
              >
                <p className="px-6 pb-4 text-sm text-content-tertiary">
                  {faq.answer}
                </p>
              </div>
            </Surface>
          ))}
        </div>
      </Container>
    </section>
  );
}

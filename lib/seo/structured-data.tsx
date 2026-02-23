/**
 * Structured Data Component
 * Injects JSON-LD structured data into the page head
 */

interface StructuredDataProps {
  data: object | object[];
}

/**
 * StructuredData - Injects JSON-LD structured data
 *
 * @example
 * ```tsx
 * export default function Page() {
 *   return (
 *     <>
 *       <StructuredData data={generateWebsiteStructuredData()} />
 *       <h1>Page content</h1>
 *     </>
 *   );
 * }
 * ```
 */
export function StructuredData({ data }: StructuredDataProps): React.JSX.Element {
  const jsonData = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : data;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonData),
      }}
    />
  );
}

export default StructuredData;

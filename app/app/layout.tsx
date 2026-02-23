import { AppShell } from "@/components/layout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AppShell>{children}</AppShell>;
}

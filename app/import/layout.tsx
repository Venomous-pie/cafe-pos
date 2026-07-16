import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Products — Cafe POS",
  description: "Import products from a CSV or Excel spreadsheet.",
};

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  // Override the root layout's overflow-hidden so the wizard can scroll freely
  return <div style={{ height: "auto", overflow: "auto", minHeight: "100vh" }}>{children}</div>;
}

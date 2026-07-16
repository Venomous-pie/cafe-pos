/**
 * Mapping template store — GET/POST /api/import/templates
 *
 * Templates are saved as a JSON file in the project root (templates.json).
 * Keyed by a normalized fingerprint of the header set so a repeat import
 * from the same source auto-applies the last mapping.
 *
 * GET  /api/import/templates?fingerprint=xxx   → return matching template
 * GET  /api/import/templates                   → return all templates
 * POST /api/import/templates                   → save a template
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEMPLATES_PATH = path.join(process.cwd(), "data", "import-templates.json");

export interface MappingTemplate {
  id: string;
  name: string;
  fingerprint: string; // sorted, lowercase headers joined with "|"
  mappings: Record<string, string | null>;
  createdAt: string;
}

function readTemplates(): MappingTemplate[] {
  if (!fs.existsSync(TEMPLATES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeTemplates(templates: MappingTemplate[]) {
  fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(templates, null, 2), "utf-8");
}

export function fingerprintHeaders(headers: string[]): string {
  return headers
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join("|");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fingerprint = searchParams.get("fingerprint");

  const templates = readTemplates();

  if (fingerprint) {
    const match = templates.find((t) => t.fingerprint === fingerprint);
    return NextResponse.json(match ?? null);
  }

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, headers, mappings } = body as {
      name: string;
      headers: string[];
      mappings: Record<string, string | null>;
    };

    if (!name || !headers || !mappings) {
      return NextResponse.json(
        { error: "name, headers, and mappings are required" },
        { status: 400 }
      );
    }

    const fingerprint = fingerprintHeaders(headers);
    const templates = readTemplates();

    // Upsert — replace existing template with same fingerprint
    const existingIdx = templates.findIndex((t) => t.fingerprint === fingerprint);
    const template: MappingTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      fingerprint,
      mappings,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      template.id = templates[existingIdx].id; // preserve ID
      templates[existingIdx] = template;
    } else {
      templates.push(template);
    }

    writeTemplates(templates);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Template save error:", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

"use client";

import { useState, useRef, useCallback } from "react";
import { SYSTEM_FIELDS, SystemField } from "@/lib/import/mapper";
import Link from "next/link";
import "./import.css";

// ─── Types ──────────────────────────────────────────────────────────────────

type Confidence = "exact" | "fuzzy" | "none";

interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

interface Suggestion {
  field: SystemField | null;
  confidence: Confidence;
  score: number;
}

interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

interface CommitResult {
  imported: number;
  skipped: number;
  errors: RowError[];
  importBatchId: string;
}

type Step = "upload" | "mapping" | "preview" | "result";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fingerprintHeaders(headers: string[]) {
  return headers.map((h) => h.toLowerCase().trim()).sort().join("|");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload step
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping step
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [mappings, setMappings] = useState<Record<string, SystemField | null>>({});
  const [templateName, setTemplateName] = useState("");
  const [savedTemplate, setSavedTemplate] = useState<{ id: string; name: string } | null>(null);

  // Result step
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/import/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setParseResult(data);

      // Fetch all rows for the actual import (re-parse client-side via same endpoint
      // but we store them here from the first parse; for large files we'd stream.
      // For now, preview rows are enough to validate the mapping — full rows sent at commit.)
      setAllRows(data.rows); // only preview for now; replaced at commit with full file

      // Auto-suggest mappings
      const suggestRes = await fetch("/api/import/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: data.headers }),
      });
      const suggestData = await suggestRes.json();
      setSuggestions(suggestData);

      const initialMappings: Record<string, SystemField | null> = {};
      for (const [header, sug] of Object.entries(suggestData) as [string, Suggestion][]) {
        initialMappings[header] = sug.field;
      }
      setMappings(initialMappings);

      // Check for a saved template matching these headers
      const fp = fingerprintHeaders(data.headers);
      const tplRes = await fetch(`/api/import/templates?fingerprint=${encodeURIComponent(fp)}`);
      const tpl = await tplRes.json();
      if (tpl) {
        // Merge saved template mappings (saved template wins over auto-suggest)
        setMappings((prev) => ({ ...prev, ...tpl.mappings }));
        setSavedTemplate({ id: tpl.id, name: tpl.name });
      }

      setStep("mapping");
    } catch (e: any) {
      setError(e.message ?? "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ── Mapping ───────────────────────────────────────────────────────────────

  const usedFields = new Set(Object.values(mappings).filter(Boolean) as SystemField[]);

  const handleSaveTemplate = async () => {
    if (!parseResult || !templateName.trim()) return;
    try {
      const res = await fetch("/api/import/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          headers: parseResult.headers,
          mappings,
        }),
      });
      const tpl = await res.json();
      setSavedTemplate({ id: tpl.id, name: tpl.name });
      setTemplateName("");
    } catch {
      // non-fatal
    }
  };

  // ── Commit ────────────────────────────────────────────────────────────────

  const handleCommit = async () => {
    if (!file || !parseResult) return;
    setLoading(true);
    setError(null);

    try {
      // Re-parse full file to get all rows (not just the 5-row preview)
      const formData = new FormData();
      formData.append("file", file);
      const fullParseRes = await fetch("/api/import/parse-full", {
        method: "POST",
        body: formData,
      });
      const fullData = await fullParseRes.json();
      if (!fullParseRes.ok) throw new Error(fullData.error);

      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings, rows: fullData.rows }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setCommitResult(result);
      setStep("result");
    } catch (e: any) {
      setError(e.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!commitResult?.importBatchId) return;
    if (!confirm("This will delete all products from this import. Are you sure?")) return;
    setLoading(true);
    try {
      await fetch(`/api/import/commit?batchId=${commitResult.importBatchId}`, {
        method: "DELETE",
      });
      setStep("upload");
      setCommitResult(null);
      setFile(null);
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setAllRows([]);
    setMappings({});
    setSuggestions({});
    setCommitResult(null);
    setError(null);
    setSavedTemplate(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="import-page">
      <header className="import-header">
        <Link href="/" className="import-back">← Back to POS</Link>
        <h1>Product Import Wizard</h1>
        <p className="import-subtitle">Import products from a CSV or Excel spreadsheet</p>
      </header>

      {/* Step indicator */}
      <div className="import-steps">
        {(["upload", "mapping", "preview", "result"] as Step[]).map((s, i) => (
          <div key={s} className={`import-step ${step === s ? "active" : ""} ${stepIndex(step) > i ? "done" : ""}`}>
            <span className="step-num">{i + 1}</span>
            <span className="step-label">{stepLabel(s)}</span>
          </div>
        ))}
      </div>

      {error && <div className="import-error">{error}</div>}

      {/* ── Step: Upload ── */}
      {step === "upload" && (
        <div className="import-card">
          <div
            className={`drop-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-icon">📂</div>
            <p className="drop-text">Drag & drop a CSV or Excel file here</p>
            <p className="drop-sub">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          {loading && <div className="import-loading">Parsing file…</div>}
        </div>
      )}

      {/* ── Step: Mapping ── */}
      {step === "mapping" && parseResult && (
        <div className="import-card">
          <div className="mapping-top">
            <div>
              <h2>Map columns to product fields</h2>
              <p className="mapping-sub">
                {savedTemplate
                  ? `✓ Template "${savedTemplate.name}" applied automatically`
                  : "Auto-suggested mappings based on your column names — adjust as needed"}
              </p>
            </div>
            <button className="btn-secondary" onClick={reset}>Start over</button>
          </div>

          <div className="mapping-table">
            <div className="mapping-row mapping-header-row">
              <span>Your column</span>
              <span>Sample values</span>
              <span>Maps to field</span>
            </div>
            {parseResult.headers.map((header) => {
              const sug = suggestions[header];
              const currentMapping = mappings[header] ?? null;

              return (
                <div key={header} className="mapping-row">
                  <span className="mapping-col-name">{header}</span>
                  <span className="mapping-samples">
                    {parseResult.rows
                      .slice(0, 2)
                      .map((r) => r[header])
                      .filter(Boolean)
                      .join(", ") || <em>—</em>}
                  </span>
                  <span className="mapping-select-wrap">
                    <select
                      className={`mapping-select ${sug?.confidence === "exact" ? "conf-exact" : sug?.confidence === "fuzzy" ? "conf-fuzzy" : ""}`}
                      value={currentMapping ?? ""}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [header]: (e.target.value as SystemField) || null,
                        }))
                      }
                    >
                      <option value="">— skip —</option>
                      {(Object.keys(SYSTEM_FIELDS) as SystemField[]).map((f) => (
                        <option
                          key={f}
                          value={f}
                          disabled={usedFields.has(f) && mappings[header] !== f}
                        >
                          {SYSTEM_FIELDS[f].label}
                          {usedFields.has(f) && mappings[header] !== f ? " (used)" : ""}
                        </option>
                      ))}
                    </select>
                    {sug?.confidence === "fuzzy" && (
                      <span className="conf-badge fuzzy" title={`Fuzzy match (${(sug.score * 100).toFixed(0)}%)`}>~</span>
                    )}
                    {sug?.confidence === "exact" && (
                      <span className="conf-badge exact" title="Exact match">✓</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Save template */}
          <div className="template-save">
            <input
              className="template-input"
              placeholder="Save this mapping as template…"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTemplate(); }}
            />
            <button
              className="btn-secondary"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              Save template
            </button>
            {savedTemplate && <span className="template-saved">✓ Saved as "{savedTemplate.name}"</span>}
          </div>

          <div className="mapping-actions">
            <button className="btn-primary" onClick={() => setStep("preview")}>
              Preview import →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === "preview" && parseResult && (
        <div className="import-card">
          <div className="mapping-top">
            <div>
              <h2>Preview</h2>
              <p className="mapping-sub">Showing first {parseResult.rows.length} rows — review before importing</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn-secondary" onClick={() => setStep("mapping")}>← Back</button>
              <button className="btn-primary" onClick={handleCommit} disabled={loading}>
                {loading ? "Importing…" : `Import all rows`}
              </button>
            </div>
          </div>

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {(Object.keys(SYSTEM_FIELDS) as SystemField[])
                    .filter((f) => Object.values(mappings).includes(f))
                    .map((f) => (
                      <th key={f}>{SYSTEM_FIELDS[f].label}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.map((row, i) => (
                  <tr key={i}>
                    {(Object.keys(SYSTEM_FIELDS) as SystemField[])
                      .filter((f) => Object.values(mappings).includes(f))
                      .map((f) => {
                        const header = Object.entries(mappings).find(([, v]) => v === f)?.[0];
                        return <td key={f}>{header ? row[header] : "—"}</td>;
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Step: Result ── */}
      {step === "result" && commitResult && (
        <div className="import-card result-card">
          <div className="result-icon">{commitResult.errors.length === 0 ? "✅" : "⚠️"}</div>
          <h2>Import complete</h2>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-num">{commitResult.imported}</span>
              <span className="stat-label">Imported</span>
            </div>
            <div className="stat">
              <span className="stat-num">{commitResult.skipped}</span>
              <span className="stat-label">Skipped</span>
            </div>
          </div>

          {commitResult.errors.length > 0 && (
            <div className="result-errors">
              <h3>Row errors</h3>
              <ul>
                {commitResult.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.rowIndex} · <strong>{e.field}</strong>: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="result-actions">
            <Link href="/" className="btn-primary">Go to POS</Link>
            <button className="btn-secondary" onClick={reset}>Import another file</button>
            <button className="btn-danger" onClick={handleRollback} disabled={loading}>
              Undo this import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stepIndex(s: Step) {
  return ["upload", "mapping", "preview", "result"].indexOf(s);
}

function stepLabel(s: Step) {
  return { upload: "Upload", mapping: "Map columns", preview: "Preview", result: "Done" }[s];
}

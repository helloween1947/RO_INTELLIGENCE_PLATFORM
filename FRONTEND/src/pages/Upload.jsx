import { useState, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

const ACCENT = "#00E5FF";
const PURPLE = "#7C4DFF";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const YELLOW = "#F59E0B";

/* ─── Step indicator ─────────────────────────────────────────────────── */
function Steps({ current }) {
  const steps = ["Select File", "Preview Columns", "Import", "Results"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            opacity: i <= current ? 1 : 0.35,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i < current ? GREEN : i === current ? ACCENT : "rgba(255,255,255,0.08)",
              border: `2px solid ${i <= current ? (i < current ? GREEN : ACCENT) : "rgba(255,255,255,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 800, color: i <= current ? "#0A1628" : "#64748B",
              flexShrink: 0,
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: i === current ? ACCENT : "#64748B", whiteSpace: "nowrap" }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 1,
              background: i < current ? GREEN : "rgba(255,255,255,0.06)",
              margin: "0 12px",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Column mapping table ────────────────────────────────────────────── */
function ColumnMap({ mapping, allColumns }) {
  const detected = Object.entries(mapping);
  if (!detected.length) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
        Auto-Detected Column Mapping
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {detected.map(([field, col]) => (
          <div key={field} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 12px", background: "rgba(0,229,255,0.04)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 6,
          }}>
            <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontFamily: "monospace" }}>{field}</span>
            <span style={{ fontSize: "0.72rem", color: ACCENT, fontWeight: 700 }}>→ {col}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: "0.72rem", color: "#64748B" }}>
        {allColumns.length - detected.length} column(s) were not mapped and will be ignored.
      </div>
    </div>
  );
}

/* ─── Preview table ────────────────────────────────────────────────────── */
function PreviewTable({ preview, columns }) {
  if (!preview?.length) return null;
  return (
    <div style={{ marginTop: 20, overflowX: "auto" }}>
      <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
        Data Preview (first 3 rows)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c} style={{ padding: "6px 10px", color: "#CBD5E1", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
                  {String(row[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Result summary ──────────────────────────────────────────────────── */
function ResultCard({ result }) {
  const stats = [
    { label: "Rows Imported",   value: result.imported,        color: GREEN },
    { label: "Rows Skipped",    value: result.skipped,         color: result.skipped > 0 ? YELLOW : "#64748B" },
    { label: "Sites Created",   value: result.sites_created,   color: PURPLE },
    { label: "Devices Created", value: result.devices_created, color: ACCENT },
  ];

  return (
    <div>
      {/* Success banner */}
      <div style={{
        padding: "18px 20px", borderRadius: 10,
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
        display: "flex", alignItems: "center", gap: 14, marginBottom: 24,
      }}>
        <span style={{ fontSize: "2rem" }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, color: GREEN, fontSize: "1rem" }}>Import Successful</div>
          <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: 2 }}>{result.message}</div>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "16px", textAlign: "center",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
          }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Detected columns */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          Columns Detected ({Object.keys(result.columns_detected).length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(result.columns_detected).map(([field, col]) => (
            <span key={field} style={{
              fontSize: "0.7rem", padding: "3px 10px", borderRadius: 4,
              background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: ACCENT,
            }}>
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Go to dashboard */}
      <a href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
        background: `linear-gradient(135deg, ${ACCENT}22, ${PURPLE}22)`,
        border: `1px solid ${ACCENT}44`, borderRadius: 8, color: ACCENT,
        fontWeight: 700, fontSize: "0.82rem", textDecoration: "none",
      }}>
        📊 View Dashboard
      </a>
    </div>
  );
}

/* ─── Main Upload Page ────────────────────────────────────────────────── */
export default function Upload() {
  const [step, setStep]           = useState(0);
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [preview, setPreview]     = useState(null);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const inputRef = useRef(null);

  /* ─ File selection ─────────────────────────────────────────────────── */
  const selectFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await axios.post(`${API_BASE}/upload/columns-preview`, fd);
      setPreview(data);
      setStep(1);
    } catch (e) {
      setError(e.response?.data?.detail || "Could not read file. Make sure it's a valid .xlsx or .csv.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  }, [selectFile]);

  /* ─ Import ─────────────────────────────────────────────────────────── */
  const doImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStep(2);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API_BASE}/upload/excel`, fd);
      setResult(data);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.detail || "Import failed. Check the console for details.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  /* ─ Reset ──────────────────────────────────────────────────────────── */
  const reset = () => {
    setFile(null); setPreview(null); setResult(null);
    setError(null); setStep(0); setLoading(false);
  };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📤 Upload Data</span>
        {step > 0 && (
          <button className="btn btn-outline btn-sm" onClick={reset}>↩ Start Over</button>
        )}
      </div>

      <div className="page-inner" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Steps current={step} />

        {/* ─── Step 0: Drop zone ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="card">
            <div className="card-body" style={{ padding: 40 }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                  Import Excel or CSV Data
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Upload the BPCL RA Analytics Portal report, or any Excel/CSV with RO data.
                  Columns are detected automatically.
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                style={{
                  border: `2px dashed ${dragging ? ACCENT : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 14,
                  padding: "60px 40px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragging ? "rgba(0,229,255,0.04)" : "rgba(255,255,255,0.015)",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>
                  {dragging ? "⬇️" : "📂"}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: dragging ? ACCENT : "var(--text-primary)", marginBottom: 8 }}>
                  {dragging ? "Drop your file here" : "Drag & drop your file here"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 20 }}>
                  or click to browse
                </div>
                <div style={{
                  display: "inline-flex", gap: 8, padding: "8px 16px",
                  background: "rgba(255,255,255,0.04)", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  {[".xlsx", ".xls", ".csv"].map(ext => (
                    <span key={ext} style={{
                      fontSize: "0.7rem", fontWeight: 700, color: ACCENT,
                      padding: "2px 8px", background: "rgba(0,229,255,0.1)",
                      borderRadius: 4, border: "1px solid rgba(0,229,255,0.2)",
                    }}>{ext}</span>
                  ))}
                </div>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => selectFile(e.target.files?.[0])} />

              {loading && (
                <div style={{ textAlign: "center", marginTop: 20, color: ACCENT }}>
                  <div className="spinner" style={{ margin: "0 auto 10px" }} />
                  Reading file...
                </div>
              )}
              {error && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: RED, fontSize: "0.82rem" }}>
                  ⚠ {error}
                </div>
              )}

              {/* Format guide */}
              <div style={{ marginTop: 32, padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                  Supported Column Names (any subset works)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    ["RO ID / Retail Outlet", "Site identification"],
                    ["No. of On-Boarded MPDs", "Total MPD count"],
                    ["No. of Online MPDs", "Online MPD count"],
                    ["MPD Online% / MPD Utilization%", "MPD percentages"],
                    ["No. of On-Boarded Tanks", "Total tank count"],
                    ["No. of Online Tanks", "Online tank count"],
                    ["Tank Online% / Tank Utilization%", "Tank percentages"],
                    ["Feed Pressure / TDS / Flow Rate", "Sensor values"],
                  ].map(([col, desc]) => (
                    <div key={col} style={{ display: "flex", gap: 8, fontSize: "0.72rem" }}>
                      <span style={{ color: ACCENT, fontFamily: "monospace", minWidth: 0 }}>{col}</span>
                      <span style={{ color: "#475569", flexShrink: 0 }}>— {desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 1: Preview + confirm ───────────────────────────────── */}
        {step === 1 && preview && (
          <div className="card">
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                    📄 {file?.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {preview.row_count} rows · {preview.columns.length} columns · {Object.keys(preview.detected_mapping).length} fields detected
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", padding: "4px 10px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: GREEN, border: "1px solid rgba(16,185,129,0.2)", fontWeight: 700 }}>
                  Ready to import
                </span>
              </div>

              <ColumnMap mapping={preview.detected_mapping} allColumns={preview.columns} />
              <PreviewTable preview={preview.preview} columns={preview.columns.slice(0, 10)} />

              {error && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: RED, fontSize: "0.82rem" }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button className="btn btn-outline" onClick={reset}>← Back</button>
                <button
                  className="btn btn-primary"
                  onClick={doImport}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? "Importing..." : `⚡ Import ${preview.row_count} Rows`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Loading ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 48, height: 48, margin: "0 auto 20px", borderWidth: 4 }} />
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                Importing data...
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Creating sites, devices, and sensor readings. Please wait.
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: Results ─────────────────────────────────────────── */}
        {step === 3 && result && (
          <div className="card">
            <div className="card-body">
              <ResultCard result={result} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  getSalesSummary, getSalesAreas, getSalesROs,
} from "../services/api";

// ── Theme ──────────────────────────────────────────────────────────────────
const CYAN   = "#00E5FF";
const PURPLE = "#7C4DFF";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const YELLOW = "#F59E0B";

const TT = {
  contentStyle: { background: "#0D1F3C", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#94A3B8" },
  itemStyle:    { color: "#F1F5F9" },
};

const pctColor  = v => v == null ? "#475569" : v >= 90 ? GREEN : v >= 70 ? YELLOW : RED;
const pctBg     = v => v >= 90 ? "rgba(16,185,129,0.15)" : v >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
const statusColor = s => s === "Fully Online" ? GREEN : s === "Partially Online" ? YELLOW : s === "Offline" ? RED : "#64748B";

// ── Mini progress bar ──────────────────────────────────────────────────────
function Bar5({ v, color }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color, marginBottom: 3 }}>{v ?? "—"}%</div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, v || 0))}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}66)`,
          transition: "width 0.7s ease",
        }} />
      </div>
    </div>
  );
}

// ── Fleet KPI card (Onboarded / Online / Offline / %) ─────────────────────
function FleetMini({ label, onboarded, online, color, icon }) {
  const offline = onboarded != null && online != null ? Math.max(0, onboarded - online) : null;
  const pct     = onboarded > 0 ? Math.min(100, Math.round(online / onboarded * 100)) : 0;
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "16px 20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        <span style={{ fontSize: "1.3rem", opacity: 0.5 }}>{icon}</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: "0.6rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Boarded</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color }}>{onboarded ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.6rem", color: GREEN, fontWeight: 700, textTransform: "uppercase" }}>Online</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: GREEN }}>{online ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.6rem", color: RED, fontWeight: 700, textTransform: "uppercase" }}>Offline</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: RED }}>{offline ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.6rem", color, fontWeight: 700, textTransform: "uppercase" }}>Online %</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color }}>{pct}%</div>
        </div>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color},${color}77)`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state" style={{ padding: "60px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>📊</div>
      <h3>No Data Available</h3>
      <p style={{ marginTop: 8, maxWidth: 400, margin: "8px auto", color: "var(--text-muted)" }}>
        Upload your BPCL RO Excel file (e.g. <em>RO DATA 22-06-26.xlsx</em>) to populate this module.
      </p>
      <a href="/upload" style={{
        display: "inline-block", marginTop: 20, padding: "10px 22px",
        background: `linear-gradient(135deg, ${CYAN}22, ${PURPLE}22)`,
        border: `1px solid ${CYAN}44`, borderRadius: 8,
        color: CYAN, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none",
      }}>📤 Go to Upload Data</a>
    </div>
  );
}

// ── Per-RO drill-down table ────────────────────────────────────────────────
function RODrillTable({ rows, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(r =>
    r.ro_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.ro_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.15)",
      borderRadius: 10, marginTop: 10, overflow: "hidden",
    }}>
      <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: CYAN }}>
          Individual RO Breakdown ({rows.length} outlets)
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Search outlet / vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, padding: "4px 10px", fontSize: "0.75rem" }}
          />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94A3B8", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: "0.75rem" }}>
            ✕ Close
          </button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.77rem" }}>
          <thead>
            <tr>
              {["RO ID", "Retail Outlet", "Vendor", "IoT", "Status",
                "MPD Boarded", "MPD Online", "MPD Offline", "MPD %",
                "Tank Boarded", "Tank Online", "Tank Offline", "Tank %",
                "MPD Util %", "Tank Util %"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h.endsWith("%") || ["MPD Boarded","MPD Online","MPD Offline","Tank Boarded","Tank Online","Tank Offline"].includes(h) ? "center" : "left", color: "#64748B", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const mc  = pctColor(r.mpd_pct);
              const tc  = pctColor(r.tank_pct);
              const sc  = statusColor(r.ro_status);
              return (
                <tr key={r.site_id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: r.ro_status === "Offline" ? "rgba(239,68,68,0.03)" : undefined }}>
                  <td style={{ padding: "7px 10px", color: CYAN, fontFamily: "monospace", fontSize: "0.72rem" }}>{r.ro_id}</td>
                  <td style={{ padding: "7px 10px", color: "#CBD5E1", fontWeight: 600, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.ro_name}</td>
                  <td style={{ padding: "7px 10px", color: "#94A3B8", fontSize: "0.72rem" }}>{r.vendor_name || "—"}</td>
                  <td style={{ padding: "7px 10px" }}>
                    {r.iot_enabled === true  && <span style={{ color: GREEN,    fontSize: "0.68rem", fontWeight: 700 }}>✓ IoT</span>}
                    {r.iot_enabled === false && <span style={{ color: "#475569", fontSize: "0.68rem" }}>Non-IoT</span>}
                    {r.iot_enabled == null  && <span style={{ color: "#475569", fontSize: "0.68rem" }}>—</span>}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: r.ro_status === "Offline" ? "rgba(239,68,68,0.15)" : r.ro_status === "Partially Online" ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)", color: sc, whiteSpace: "nowrap" }}>
                      {r.ro_status || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: CYAN }}>{r.onb_mpd}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: GREEN }}>{r.onl_mpd}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: r.off_mpd > 0 ? RED : "#475569" }}>{r.off_mpd}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    {r.mpd_pct != null ? <span style={{ fontSize: "0.73rem", fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: pctBg(r.mpd_pct), color: mc }}>{r.mpd_pct}%</span> : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: PURPLE }}>{r.onb_tank}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: GREEN }}>{r.onl_tank}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: r.off_tank > 0 ? RED : "#475569" }}>{r.off_tank}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    {r.tank_pct != null ? <span style={{ fontSize: "0.73rem", fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: pctBg(r.tank_pct), color: tc }}>{r.tank_pct}%</span> : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center", color: pctColor(r.mpd_util), fontWeight: 700 }}>{r.mpd_util != null ? `${r.mpd_util}%` : "—"}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", color: pctColor(r.tank_util), fontWeight: 700 }}>{r.tank_util != null ? `${r.tank_util}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SalesPerformance() {
  const [summary, setSummary] = useState(null);
  const [areas,   setAreas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Drill-down state
  const [drillArea,    setDrillArea]    = useState(null);
  const [drillROs,     setDrillROs]     = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, a] = await Promise.all([getSalesSummary(), getSalesAreas()]);
      setSummary(s.data);
      setAreas(a.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDrill = useCallback(async (area) => {
    if (drillArea === area) { setDrillArea(null); setDrillROs([]); return; }
    setDrillArea(area);
    setDrillLoading(true);
    try {
      const { data } = await getSalesROs(area);
      setDrillROs(data);
    } catch { setDrillROs([]); }
    finally { setDrillLoading(false); }
  }, [drillArea]);

  // Export CSV
  const exportCSV = () => {
    if (!areas.length) return;
    const headers = [
      "Sales Area", "Total ROs", "Fully Online", "Partially Online", "Offline ROs",
      "IoT Enabled", "Non-IoT",
      "MPD Boarded", "MPD Online", "MPD Offline", "MPD Online%", "Avg MPD Util%",
      "Tank Boarded", "Tank Online", "Tank Offline", "Tank Online%", "Avg Tank Util%",
    ];
    const rows = areas.map(a => [
      a.sales_area, a.ro_count, a.fully_online, a.partial, a.offline_ros,
      a.iot_count, a.non_iot_count,
      a.onb_mpd, a.onl_mpd, a.off_mpd, a.mpd_online_pct ?? "", a.avg_mpd_util ?? "",
      a.onb_tank, a.onl_tank, a.off_tank, a.tank_online_pct ?? "", a.avg_tank_util ?? "",
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "sales_area_performance.csv"; el.click();
    URL.revokeObjectURL(url);
  };

  const S = summary || {};
  const hasData = areas.length > 0;

  // chart data for grouped bar
  const chartData = useMemo(() => areas.map(a => ({
    name:      a.sales_area,
    onb_mpd:   a.onb_mpd,
    onl_mpd:   a.onl_mpd,
    off_mpd:   a.off_mpd,
    onb_tank:  a.onb_tank,
    onl_tank:  a.onl_tank,
    off_tank:  a.off_tank,
    mpd_pct:   a.mpd_online_pct,
    tank_pct:  a.tank_online_pct,
    fully:     a.fully_online,
    partial:   a.partial,
    offline:   a.offline_ros,
  })), [areas]);

  return (
    <div>
      {/* ── Top Bar ── */}
      <div className="topbar">
        <span className="topbar-title">📈 Sales Wise RO Performance</span>
        <div className="topbar-right">
          {loading && <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
          <button className="btn btn-outline btn-sm" onClick={load}>↺ Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={!hasData}>⬇ Export CSV</button>
        </div>
      </div>

      <div className="page-inner">
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: RED, fontSize: "0.83rem", marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Row 1: RO Status KPIs ── */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 16 }}>
          {[
            { label: "Sales Areas",      value: S.total_sales_areas,  icon: "🗺", accent: PURPLE },
            { label: "Total ROs",        value: S.total_ros,          icon: "🏭", accent: CYAN   },
            { label: "Fully Online ROs", value: S.total_fully_online, icon: "✅", accent: GREEN,  sub: S.total_ros ? `${Math.round((S.total_fully_online||0)/S.total_ros*100)}% of network` : null },
            { label: "Partially Online", value: S.total_partial,      icon: "⚡", accent: YELLOW },
            { label: "Offline ROs",      value: S.total_offline,      icon: "🔴", accent: RED    },
            { label: "IoT Enabled ROs",  value: S.iot_enabled_ros,    icon: "📡", accent: CYAN,   sub: S.total_ros ? `${Math.round((S.iot_enabled_ros||0)/S.total_ros*100)}% of network` : null },
          ].map(({ label, value, icon, accent, sub }) => (
            <div key={label} className="kpi-card" style={{ "--accent": accent }}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value ?? "—"}</div>
              {sub && <div className="kpi-sub">{sub}</div>}
              <div className="kpi-icon">{icon}</div>
            </div>
          ))}
        </div>

        {/* ── Row 2: MPD + Tank Network Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <FleetMini label="MPD Network (All Areas)"        onboarded={S.total_onb_mpd}  online={S.total_onl_mpd}  color={CYAN}   icon="⛽" />
          <FleetMini label="Tank / ATG Network (All Areas)" onboarded={S.total_onb_tank} online={S.total_onl_tank} color={PURPLE} icon="🛢️" />
        </div>

        {!hasData && !loading && <EmptyState />}

        {hasData && (
          <>
            {/* ── Charts Row: MPD Online% + Tank Online% ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* MPD online% by area */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⛽ MPD Online % by Sales Area</div>
                  <div className="chart-sub">% of on-boarded MPDs currently online per area</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} unit="%" />
                      <Tooltip {...TT} formatter={(v) => [`${v}%`, "MPD Online%"]} />
                      <Bar dataKey="mpd_pct" name="MPD Online%" radius={[5, 5, 0, 0]}>
                        {chartData.map((d, i) => <Cell key={i} fill={pctColor(d.mpd_pct)} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tank online% by area */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🛢️ Tank Online % by Sales Area</div>
                  <div className="chart-sub">% of on-boarded tanks currently online per area</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} unit="%" />
                      <Tooltip {...TT} formatter={(v) => [`${v}%`, "Tank Online%"]} />
                      <Bar dataKey="tank_pct" name="Tank Online%" radius={[5, 5, 0, 0]}>
                        {chartData.map((d, i) => <Cell key={i} fill={pctColor(d.tank_pct)} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RO Status grouped bar */}
              <div className="card col-span-2">
                <div className="card-body">
                  <div className="chart-title">🏭 RO Status by Sales Area</div>
                  <div className="chart-sub">Count of Fully Online / Partially Online / Offline ROs per area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="fully"   name="Fully Online"     fill={GREEN}  fillOpacity={0.8} radius={[4,4,0,0]} stackId="status" />
                      <Bar dataKey="partial" name="Partial Online"   fill={YELLOW} fillOpacity={0.8} stackId="status" />
                      <Bar dataKey="offline" name="Offline"          fill={RED}    fillOpacity={0.8} radius={[0,0,4,4]} stackId="status" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MPD Onboarded vs Online vs Offline */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⛽ MPD Count — Boarded vs Online vs Offline</div>
                  <div className="chart-sub">Absolute MPD device counts per sales area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="onb_mpd" name="MPD Boarded" fill={CYAN}   fillOpacity={0.5} radius={[4,4,0,0]} />
                      <Bar dataKey="onl_mpd" name="MPD Online"  fill={GREEN}  fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="off_mpd" name="MPD Offline" fill={RED}    fillOpacity={0.85} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tank Onboarded vs Online vs Offline */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🛢️ Tank Count — Boarded vs Online vs Offline</div>
                  <div className="chart-sub">Absolute Tank device counts per sales area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="onb_tank" name="Tank Boarded" fill={PURPLE} fillOpacity={0.5} radius={[4,4,0,0]} />
                      <Bar dataKey="onl_tank" name="Tank Online"  fill={GREEN}  fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="off_tank" name="Tank Offline" fill={RED}    fillOpacity={0.85} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Full Sales Area Scorecard Table + Drill-down ── */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div className="chart-title">📋 Sales Area Full Scorecard</div>
                    <div className="chart-sub">Click any row to drill down into individual RO performance for that area</div>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{areas.length} areas · {areas.reduce((s, a) => s + a.ro_count, 0)} total ROs</span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Sales Area</th>
                        <th style={{ textAlign: "center" }}>Total ROs</th>
                        <th style={{ textAlign: "center", color: GREEN }}>Fully Online</th>
                        <th style={{ textAlign: "center", color: YELLOW }}>Partial</th>
                        <th style={{ textAlign: "center", color: RED }}>Offline</th>
                        <th style={{ textAlign: "center", color: CYAN }}>IoT ROs</th>
                        <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                        <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                        <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                        <th style={{ minWidth: 120 }}>MPD Online %</th>
                        <th style={{ textAlign: "center", color: CYAN }}>Avg MPD Util %</th>
                        <th style={{ textAlign: "center", color: PURPLE }}>Tank Boarded</th>
                        <th style={{ textAlign: "center", color: GREEN }}>Tank Online</th>
                        <th style={{ textAlign: "center", color: RED }}>Tank Offline</th>
                        <th style={{ minWidth: 120 }}>Tank Online %</th>
                        <th style={{ textAlign: "center", color: PURPLE }}>Avg Tank Util %</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {areas.map(a => (
                        <>
                          <tr
                            key={a.sales_area}
                            onClick={() => handleDrill(a.sales_area)}
                            style={{ cursor: "pointer" }}
                            className={drillArea === a.sales_area ? "drill-active-row" : ""}
                          >
                            <td style={{ fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{a.sales_area}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.ro_count}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>
                              {a.fully_online} <span style={{ fontSize: "0.68rem", color: "#64748B" }}>({a.fully_pct}%)</span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{a.partial}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: a.offline_ros > 0 ? RED : "#475569" }}>{a.offline_ros}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.iot_count}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.onb_mpd}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.onl_mpd}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: a.off_mpd > 0 ? RED : "#475569" }}>{a.off_mpd}</td>
                            <td>
                              <Bar5 v={a.mpd_online_pct} color={pctColor(a.mpd_online_pct)} />
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: pctColor(a.avg_mpd_util) }}>
                              {a.avg_mpd_util != null ? `${a.avg_mpd_util}%` : "—"}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{a.onb_tank}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.onl_tank}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: a.off_tank > 0 ? RED : "#475569" }}>{a.off_tank}</td>
                            <td>
                              <Bar5 v={a.tank_online_pct} color={pctColor(a.tank_online_pct)} />
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: pctColor(a.avg_tank_util) }}>
                              {a.avg_tank_util != null ? `${a.avg_tank_util}%` : "—"}
                            </td>
                            <td>
                              <span style={{
                                fontSize: "0.7rem", padding: "2px 10px", borderRadius: 4,
                                background: drillArea === a.sales_area ? `${CYAN}22` : "rgba(255,255,255,0.05)",
                                border: `1px solid ${drillArea === a.sales_area ? CYAN + "44" : "rgba(255,255,255,0.08)"}`,
                                color: drillArea === a.sales_area ? CYAN : "#64748B",
                              }}>
                                {drillArea === a.sales_area ? "▲ Hide" : "▼ ROs"}
                              </span>
                            </td>
                          </tr>

                          {drillArea === a.sales_area && (
                            <tr key={`${a.sales_area}-drill`}>
                              <td colSpan={17} style={{ padding: "0 0 14px 0" }}>
                                {drillLoading
                                  ? <div className="loading-center" style={{ minHeight: 80 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
                                  : <RODrillTable rows={drillROs} onClose={() => setDrillArea(null)} />
                                }
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

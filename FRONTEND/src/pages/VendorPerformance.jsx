import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from "recharts";
import { getVendorSummary, getVendors, getVendorROs } from "../services/api";

// ── Theme ──────────────────────────────────────────────────────────────────
const CYAN   = "#00E5FF";
const PURPLE = "#7C4DFF";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const YELLOW = "#F59E0B";
const ORANGE = "#F97316";
const BLUE   = "#3B82F6";

const VENDOR_COLORS = [CYAN, PURPLE, GREEN, YELLOW, ORANGE, BLUE, RED, "#EC4899", "#14B8A6", "#8B5CF6"];

const TT = {
  contentStyle: { background: "#0D1F3C", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#94A3B8" },
  itemStyle:    { color: "#F1F5F9" },
};

const pctColor = v => v == null ? "#475569" : v >= 90 ? GREEN : v >= 70 ? YELLOW : RED;
const pctBg    = v => v >= 90 ? "rgba(16,185,129,0.15)" : v >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
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

// ── Fleet mini card ────────────────────────────────────────────────────────
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
        {[["Boarded", onboarded, color], ["Online", online, GREEN], ["Offline", offline, RED], ["Online %", `${pct}%`, color]].map(([lbl, val, c]) => (
          <div key={lbl}>
            <div style={{ fontSize: "0.6rem", color: c, fontWeight: 700, textTransform: "uppercase" }}>{lbl}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: c }}>{val ?? "—"}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color},${color}77)`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ msg }) {
  return (
    <div className="empty-state" style={{ padding: "60px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏢</div>
      <h3>No Vendor Data Available</h3>
      <p style={{ marginTop: 8, maxWidth: 400, margin: "8px auto", color: "var(--text-muted)" }}>
        {msg || "Upload your BPCL RO Excel file to populate this module."}
      </p>
      <a href="/upload" style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", background: `linear-gradient(135deg, ${CYAN}22, ${PURPLE}22)`, border: `1px solid ${CYAN}44`, borderRadius: 8, color: CYAN, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>📤 Go to Upload Data</a>
    </div>
  );
}

// ── RO Drill-down table ────────────────────────────────────────────────────
function RODrillTable({ rows, vendorName, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(r =>
    r.ro_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.ro_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.sales_area?.toLowerCase().includes(search.toLowerCase())
  );

  if (!rows?.length) return <EmptyState msg={`No ROs found for vendor: ${vendorName}`} />;
  return (
    <div style={{ background: "rgba(124,77,255,0.04)", border: "1px solid rgba(124,77,255,0.2)", borderRadius: 10, marginTop: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: PURPLE }}>
          🏢 {vendorName} — {rows.length} Retail Outlets
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input className="input" placeholder="Search outlet / area..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, padding: "4px 10px", fontSize: "0.75rem" }} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94A3B8", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: "0.75rem" }}>✕ Close</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.77rem" }}>
          <thead>
            <tr>
              {["RO ID", "Retail Outlet", "Sales Area", "IoT", "Status",
                "MPD Boarded", "MPD Online", "MPD Offline", "MPD %",
                "Tank Boarded", "Tank Online", "Tank Offline", "Tank %",
                "MPD Util %", "Tank Util %"
              ].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: ["MPD Boarded","MPD Online","MPD Offline","Tank Boarded","Tank Online","Tank Offline"].includes(h) ? "center" : "left", color: "#64748B", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const mc = pctColor(r.mpd_pct);
              const tc = pctColor(r.tank_pct);
              const sc = statusColor(r.ro_status);
              return (
                <tr key={r.site_id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: r.ro_status === "Offline" ? "rgba(239,68,68,0.03)" : undefined }}>
                  <td style={{ padding: "7px 10px", color: CYAN, fontFamily: "monospace", fontSize: "0.72rem" }}>{r.ro_id}</td>
                  <td style={{ padding: "7px 10px", color: "#CBD5E1", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ro_name}</td>
                  <td style={{ padding: "7px 10px", color: "#94A3B8", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{r.sales_area}</td>
                  <td style={{ padding: "7px 10px" }}>
                    {r.iot_enabled === true  && <span style={{ color: GREEN,    fontSize: "0.68rem", fontWeight: 700 }}>✓ IoT</span>}
                    {r.iot_enabled === false && <span style={{ color: "#475569", fontSize: "0.68rem" }}>Non-IoT</span>}
                    {r.iot_enabled == null  && <span style={{ color: "#475569", fontSize: "0.68rem" }}>—</span>}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: 3,
                      background: r.ro_status === "Offline" ? "rgba(239,68,68,0.15)" : r.ro_status === "Partially Online" ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                      color: sc, whiteSpace: "nowrap" }}>
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
export default function VendorPerformance() {
  const [summary,     setSummary]     = useState(null);
  const [vendors,     setVendors]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [drillVendor, setDrillVendor] = useState(null);
  const [drillROs,    setDrillROs]    = useState([]);
  const [drillLoading,setDrillLoading]= useState(false);
  const [unknownROs,  setUnknownROs]  = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, v, u] = await Promise.all([
        getVendorSummary(),
        getVendors(),
        getVendorROs("Unknown Vendor"),
      ]);
      setSummary(s.data);
      setVendors(v.data);
      setUnknownROs(u.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDrill = useCallback(async (name) => {
    if (drillVendor === name) { setDrillVendor(null); setDrillROs([]); return; }
    setDrillVendor(name); setDrillLoading(true);
    try { const { data } = await getVendorROs(name); setDrillROs(data); }
    catch { setDrillROs([]); }
    finally { setDrillLoading(false); }
  }, [drillVendor]);

  // Export CSV
  const exportCSV = () => {
    if (!vendors.length) return;
    const headers = [
      "Vendor", "Total ROs", "Fully Online", "Partially Online", "Offline ROs", "IoT ROs",
      "MPD Boarded", "MPD Online", "MPD Offline", "MPD Online%", "Avg MPD Util%",
      "Tank Boarded", "Tank Online", "Tank Offline", "Tank Online%", "Avg Tank Util%",
    ];
    const rows = vendors.map(v => [
      v.vendor_name, v.ro_count, v.fully_online, v.partial, v.offline_ros, v.iot_count,
      v.onb_mpd, v.onl_mpd, v.off_mpd, v.mpd_online_pct ?? "", v.avg_mpd_util ?? "",
      v.onb_tank, v.onl_tank, v.off_tank, v.tank_online_pct ?? "", v.avg_tank_util ?? "",
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "vendor_performance.csv"; el.click();
    URL.revokeObjectURL(url);
  };

  const S       = summary || {};
  const hasData = vendors.length > 0;

  // chart data
  const chartData = useMemo(() => vendors.map((v, i) => ({
    name:     v.vendor_name,
    ros:      v.ro_count,
    onb_mpd:  v.onb_mpd,
    onl_mpd:  v.onl_mpd,
    off_mpd:  v.off_mpd,
    mpd_pct:  v.mpd_online_pct,
    tank_pct: v.tank_online_pct,
    fully:    v.fully_online,
    partial:  v.partial,
    offline:  v.offline_ros,
    color:    VENDOR_COLORS[i % VENDOR_COLORS.length],
  })), [vendors]);

  const pieData = useMemo(() => vendors.map((v, i) => ({
    name: v.vendor_name, value: v.ro_count,
    fill: VENDOR_COLORS[i % VENDOR_COLORS.length],
  })), [vendors]);

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🏢 Vendor Wise RO Performance</span>
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

        {/* ── Row 1: Fleet KPIs ── */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 16 }}>
          {[
            { label: "Total Vendors",    value: S.total_vendors,       icon: "🏢", accent: PURPLE },
            { label: "Total ROs",        value: S.total_ros,           icon: "🏭", accent: CYAN   },
            { label: "Fully Online ROs", value: S.total_fully_online,  icon: "✅", accent: GREEN,
              sub: S.total_ros ? `${Math.round((S.total_fully_online||0)/S.total_ros*100)}% of network` : null },
            { label: "Partially Online", value: S.total_partial,       icon: "⚡", accent: YELLOW },
            { label: "Offline ROs",      value: S.total_offline,       icon: "🔴", accent: RED    },
            { label: "IoT Enabled ROs",  value: S.iot_enabled_ros,     icon: "📡", accent: CYAN,
              sub: S.total_ros ? `${Math.round((S.iot_enabled_ros||0)/S.total_ros*100)}% of network` : null },
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
          <FleetMini label="MPD Network (All Vendors)"        onboarded={S.total_onb_mpd}  online={S.total_onl_mpd}  color={CYAN}   icon="⛽" />
          <FleetMini label="Tank / ATG Network (All Vendors)" onboarded={S.total_onb_tank} online={S.total_onl_tank} color={PURPLE} icon="🛢️" />
        </div>

        {!hasData && !loading && <EmptyState />}

        {hasData && (
          <>
            {/* ── Charts ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>

              {/* MPD Online% by vendor */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⛽ MPD Online % by Vendor</div>
                  <div className="chart-sub">% of on-boarded MPDs currently online per vendor</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 85 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} unit="%" />
                      <Tooltip {...TT} formatter={(v) => [`${v}%`, "MPD Online%"]} />
                      <Bar dataKey="mpd_pct" name="MPD Online%" radius={[5, 5, 0, 0]}>
                        {chartData.map((d, i) => <Cell key={i} fill={pctColor(d.mpd_pct)} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RO Market Share Pie */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🥧 RO Market Share by Vendor</div>
                  <div className="chart-sub">Number of Retail Outlets managed per RA Vendor</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", height: 240 }}>
                    <div style={{ width: "45%", height: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                            label={false}
                          >
                            {pieData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                          </Pie>
                          <Tooltip {...TT} formatter={(v) => [v, "ROs"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: "55%", maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 6 }}>
                      {pieData.map(d => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem" }}>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: d.fill }} />
                          <span style={{ color: "#E2E8F0", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.name}>{d.name}</span>
                          <span style={{ color: "#94A3B8" }}>{d.value} ({S.total_ros ? Math.round(d.value / S.total_ros * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RO Status stacked bar */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🏭 RO Status by Vendor</div>
                  <div className="chart-sub">Fully Online / Partially Online / Offline ROs per vendor</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="fully"   name="Fully Online"   fill={GREEN}  fillOpacity={0.8} stackId="s" radius={[4,4,0,0]} />
                      <Bar dataKey="partial" name="Partially Online" fill={YELLOW} fillOpacity={0.8} stackId="s" />
                      <Bar dataKey="offline" name="Offline"         fill={RED}    fillOpacity={0.8} stackId="s" radius={[0,0,4,4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MPD boarded vs online vs offline */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⛽ MPD Count — Boarded vs Online vs Offline</div>
                  <div className="chart-sub">Absolute MPD device counts per vendor</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="onb_mpd" name="MPD Boarded" fill={CYAN}  fillOpacity={0.5} radius={[4,4,0,0]} />
                      <Bar dataKey="onl_mpd" name="MPD Online"  fill={GREEN} fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="off_mpd" name="MPD Offline" fill={RED}   fillOpacity={0.85} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Vendor Scorecard Table + Drill-down ── */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div className="chart-title">📋 Vendor Full Scorecard</div>
                    <div className="chart-sub">Click any row to drill down into individual ROs for that vendor</div>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{vendors.length} vendors · {vendors.reduce((s, v) => s + v.ro_count, 0)} total ROs</span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>RA Vendor</th>
                        <th style={{ textAlign: "center" }}>Total ROs</th>
                        <th style={{ textAlign: "center", color: GREEN }}>Fully Online</th>
                        <th style={{ textAlign: "center", color: YELLOW }}>Partial</th>
                        <th style={{ textAlign: "center", color: RED }}>Offline</th>
                        <th style={{ textAlign: "center", color: CYAN }}>IoT ROs</th>
                        <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                        <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                        <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                        <th style={{ minWidth: 120 }}>MPD Online %</th>
                        <th style={{ textAlign: "center" }}>Avg MPD Util%</th>
                        <th style={{ textAlign: "center", color: PURPLE }}>Tank Boarded</th>
                        <th style={{ textAlign: "center", color: GREEN }}>Tank Online</th>
                        <th style={{ textAlign: "center", color: RED }}>Tank Offline</th>
                        <th style={{ minWidth: 120 }}>Tank Online %</th>
                        <th style={{ textAlign: "center" }}>Avg Tank Util%</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v, i) => (
                        <>
                          <tr
                            key={v.vendor_name}
                            onClick={() => handleDrill(v.vendor_name)}
                            style={{ cursor: "pointer" }}
                            className={drillVendor === v.vendor_name ? "drill-active-row" : ""}
                          >
                            <td style={{ fontWeight: 700, color: VENDOR_COLORS[i % VENDOR_COLORS.length], whiteSpace: "nowrap" }}>{v.vendor_name}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{v.ro_count}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>
                              {v.fully_online} <span style={{ fontSize: "0.68rem", color: "#64748B" }}>({v.fully_pct}%)</span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{v.partial}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: v.offline_ros > 0 ? RED : "#475569" }}>{v.offline_ros}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{v.iot_count}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{v.onb_mpd}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{v.onl_mpd}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: v.off_mpd > 0 ? RED : "#475569" }}>{v.off_mpd}</td>
                            <td><Bar5 v={v.mpd_online_pct} color={pctColor(v.mpd_online_pct)} /></td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: pctColor(v.avg_mpd_util) }}>
                              {v.avg_mpd_util != null ? `${v.avg_mpd_util}%` : "—"}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{v.onb_tank}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{v.onl_tank}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: v.off_tank > 0 ? RED : "#475569" }}>{v.off_tank}</td>
                            <td><Bar5 v={v.tank_online_pct} color={pctColor(v.tank_online_pct)} /></td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: pctColor(v.avg_tank_util) }}>
                              {v.avg_tank_util != null ? `${v.avg_tank_util}%` : "—"}
                            </td>
                            <td>
                              <span style={{ fontSize: "0.7rem", padding: "2px 10px", borderRadius: 4,
                                background: drillVendor === v.vendor_name ? `${PURPLE}22` : "rgba(255,255,255,0.05)",
                                border: `1px solid ${drillVendor === v.vendor_name ? PURPLE + "44" : "rgba(255,255,255,0.08)"}`,
                                color: drillVendor === v.vendor_name ? PURPLE : "#64748B" }}>
                                {drillVendor === v.vendor_name ? "▲ Hide" : "▼ ROs"}
                              </span>
                            </td>
                          </tr>

                          {drillVendor === v.vendor_name && (
                            <tr key={`${v.vendor_name}-drill`}>
                              <td colSpan={17} style={{ padding: "0 0 14px 0" }}>
                                {drillLoading
                                  ? <div className="loading-center" style={{ minHeight: 80 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
                                  : <RODrillTable rows={drillROs} vendorName={v.vendor_name} onClose={() => setDrillVendor(null)} />
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

            {/* ── Unknown Vendor Outlets Section ── */}
            {unknownROs.length > 0 && (
              <div className="card" style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.02)", marginTop: 20 }}>
                <div className="card-body">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                    <div>
                      <div className="chart-title" style={{ color: YELLOW }}>Outlets with Unknown Vendor ({unknownROs.length})</div>
                      <div className="chart-sub">The following retail outlets do not have a vendor assigned in the database:</div>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>RO ID</th>
                          <th>Retail Outlet Name</th>
                          <th>Sales Area</th>
                          <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                          <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                          <th style={{ textAlign: "center", color: PURPLE }}>Tank Boarded</th>
                          <th style={{ textAlign: "center", color: GREEN }}>Tank Online</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unknownROs.map(r => (
                          <tr key={r.site_id}>
                            <td style={{ fontFamily: "monospace", color: CYAN, fontWeight: 700 }}>{r.ro_id}</td>
                            <td style={{ fontWeight: 600, color: "#E2E8F0" }}>{r.ro_name}</td>
                            <td style={{ color: "#94A3B8" }}>{r.sales_area}</td>
                            <td style={{ textAlign: "center" }}>{r.onb_mpd}</td>
                            <td style={{ textAlign: "center", color: GREEN, fontWeight: 700 }}>{r.onl_mpd}</td>
                            <td style={{ textAlign: "center" }}>{r.onb_tank}</td>
                            <td style={{ textAlign: "center", color: GREEN, fontWeight: 700 }}>{r.onl_tank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

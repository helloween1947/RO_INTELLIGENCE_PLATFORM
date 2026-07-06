import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from "recharts";
import {
  getIoTSummary, getIoTByArea, getIoTByVendor, getIoTPerformance,
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

const pctColor = v => v == null ? "#475569" : v >= 90 ? GREEN : v >= 70 ? YELLOW : RED;
const pctBg    = v => v >= 90 ? "rgba(16,185,129,0.15)" : v >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";

// ── Fleet card (Boarded / Online / Offline / %) ───────────────────────────
function FleetCard({ label, onboarded, online, color, icon }) {
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
        {[["Boarded", onboarded, color], ["Online", online, GREEN], ["Offline", offline, RED], ["Online%", `${pct}%`, pctColor(pct)]].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: "0.6rem", color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: c }}>{v ?? "—"}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color},${color}77)`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Horizontal dual comparison bar ────────────────────────────────────────
function CompareBar({ label, iotVal, nonVal, isCount = false }) {
  const max    = Math.max(iotVal ?? 0, nonVal ?? 0, 1);
  const iotW   = ((iotVal ?? 0) / max) * 100;
  const nonW   = ((nonVal ?? 0) / max) * 100;
  const delta  = iotVal != null && nonVal != null ? (iotVal - nonVal) : null;
  const deltaStr = delta != null ? (isCount ? delta : `${Math.abs(delta).toFixed(1)}%`) : null;
  const dColor = delta == null ? "#64748B" : delta >= 0 ? GREEN : RED;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#94A3B8" }}>{label}</span>
        {deltaStr != null && (
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: dColor }}>
            {delta >= 0 ? "▲" : "▼"} {deltaStr} {!isCount ? "gap" : ""}
          </span>
        )}
      </div>
      {/* IoT row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
        <span style={{ fontSize: "0.68rem", color: CYAN, width: 75, flexShrink: 0, fontWeight: 700, whiteSpace: "nowrap" }}>📡 IoT</span>
        <div style={{ flex: 1, height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${iotW}%`, height: "100%", background: `linear-gradient(90deg,${CYAN},${CYAN}88)`, transition: "width 0.8s", borderRadius: 6 }} />
        </div>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: CYAN, width: 52, textAlign: "right" }}>
          {iotVal != null ? (isCount ? iotVal : `${Number(iotVal).toFixed(1)}%`) : "—"}
        </span>
      </div>
      {/* Non-IoT row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "0.68rem", color: YELLOW, width: 75, flexShrink: 0, fontWeight: 700, whiteSpace: "nowrap" }}>🔌 Non-IoT</span>
        <div style={{ flex: 1, height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${nonW}%`, height: "100%", background: `linear-gradient(90deg,${YELLOW},${YELLOW}88)`, transition: "width 0.8s", borderRadius: 6 }} />
        </div>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: YELLOW, width: 52, textAlign: "right" }}>
          {nonVal != null ? (isCount ? nonVal : `${Number(nonVal).toFixed(1)}%`) : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state" style={{ padding: "60px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>📡</div>
      <h3>No IoT Data Available</h3>
      <p style={{ marginTop: 8, maxWidth: 400, margin: "8px auto", color: "var(--text-muted)" }}>
        Upload your BPCL RO Excel file with the <em>IOT Enabled</em> column to populate this comparison.
      </p>
      <a href="/upload" style={{ display: "inline-block", marginTop: 20, padding: "10px 22px", background: `linear-gradient(135deg, ${CYAN}22, ${PURPLE}22)`, border: `1px solid ${CYAN}44`, borderRadius: 8, color: CYAN, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>📤 Go to Upload Data</a>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function IoTComparison() {
  const [summary, setSummary] = useState(null);
  const [byArea,  setByArea]  = useState([]);
  const [byVendor,setByVendor]= useState([]);
  const [perf,    setPerf]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, a, v, p] = await Promise.all([
        getIoTSummary(), getIoTByArea(), getIoTByVendor(), getIoTPerformance(),
      ]);
      setSummary(s.data);
      setByArea(a.data);
      setByVendor(v.data);
      setPerf(p.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!byArea.length) return;
    const headers = [
      "Sales Area", "Total ROs", "IoT ROs", "Non-IoT ROs", "IoT %",
      "IoT Fully Online", "IoT Partial", "IoT Offline",
      "Non-IoT Fully Online", "Non-IoT Partial", "Non-IoT Offline",
      "IoT MPD Boarded", "IoT MPD Online", "IoT MPD Offline", "IoT MPD %",
      "Non-IoT MPD Boarded", "Non-IoT MPD Online", "Non-IoT MPD Offline", "Non-IoT MPD %",
      "IoT Avg Util %", "Non-IoT Avg Util %",
    ];
    const rows = byArea.map(a => [
      a.sales_area, a.total_ros, a.iot_ros, a.non_iot_ros, a.iot_pct,
      a.iot_fully, a.iot_partial, a.iot_offline,
      a.non_fully, a.non_partial, a.non_offline,
      a.iot_onb_mpd, a.iot_onl_mpd, a.iot_off_mpd, a.iot_mpd_pct ?? "",
      a.non_onb_mpd, a.non_onl_mpd, a.non_off_mpd, a.non_mpd_pct ?? "",
      a.iot_avg_util ?? "", a.non_avg_util ?? "",
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = "iot_comparison.csv"; el.click();
    URL.revokeObjectURL(url);
  };

  const S       = summary || {};
  const I       = perf?.iot     || {};
  const N       = perf?.non_iot || {};
  const hasData = S.total_ros > 0;

  // Pie data — RO distribution
  const pieData = useMemo(() => [
    { name: "IoT Enabled", value: S.iot_count   || 0, fill: CYAN   },
    { name: "Non-IoT",     value: S.non_iot_count || 0, fill: YELLOW },
  ].filter(d => d.value > 0), [S]);

  // Per-area charts
  const areaRoBar   = useMemo(() => byArea.map(a => ({ name: a.sales_area, "IoT ROs": a.iot_ros, "Non-IoT ROs": a.non_iot_ros })), [byArea]);
  const areaMpdBar  = useMemo(() => byArea.map(a => ({ name: a.sales_area, "IoT MPD Online%": a.iot_mpd_pct, "Non-IoT MPD Online%": a.non_mpd_pct })), [byArea]);
  const areaTankBar = useMemo(() => byArea.map(a => ({ name: a.sales_area, "IoT Tank Online%": a.iot_tank_pct, "Non-IoT Tank Online%": a.non_tank_pct })), [byArea]);

  // Vendor chart
  const vendorBar = useMemo(() => byVendor.map(v => ({ name: v.vendor, "IoT ROs": v.iot_ros, "Non-IoT ROs": v.non_iot_ros })), [byVendor]);

  const badge = (v, colorFn = pctColor) => v != null
    ? <span style={{ fontSize: "0.73rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: pctBg(v), color: colorFn(v) }}>{v}%</span>
    : <span style={{ color: "#475569" }}>—</span>;

  const statusBadge = (count, type) => {
    const c = type === "fully" ? GREEN : type === "partial" ? YELLOW : RED;
    return <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c }}>{count}</span>;
  };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📡 IoT Enabled vs Non-IoT Analysis</span>
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
            { label: "Total ROs",      value: S.total_ros,     icon: "🏭", accent: PURPLE },
            { label: "IoT Enabled ROs", value: S.iot_count,    icon: "📡", accent: CYAN,
              sub: S.total_ros ? `${S.iot_coverage_pct}% coverage` : null },
            { label: "Non-IoT ROs",    value: S.non_iot_count, icon: "🔌", accent: YELLOW,
              sub: S.total_ros ? `${Math.round((S.non_iot_count||0)/S.total_ros*100)}% of network` : null },
            { label: "IoT — Fully Online",  value: S.iot_fully_online, icon: "✅", accent: GREEN  },
            { label: "IoT — Offline ROs",   value: S.iot_offline,      icon: "🔴", accent: RED    },
            { label: "MPD Online Gap",
              value: S.mpd_online_gap != null ? `${Math.abs(S.mpd_online_gap)}%` : "—",
              icon: "⚡", accent: S.mpd_online_gap >= 0 ? GREEN : RED,
              sub: S.mpd_online_gap != null ? `IoT ${S.mpd_online_gap >= 0 ? "better" : "worse"} by ${Math.abs(S.mpd_online_gap)}%` : null },
          ].map(({ label, value, icon, accent, sub }) => (
            <div key={label} className="kpi-card" style={{ "--accent": accent }}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value" style={{ fontSize: String(value).length > 6 ? "1.3rem" : undefined }}>{value ?? "—"}</div>
              {sub && <div className="kpi-sub">{sub}</div>}
              <div className="kpi-icon">{icon}</div>
            </div>
          ))}
        </div>

        {/* ── Row 2: Network cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <FleetCard label="MPD Network — IoT ROs Only"    onboarded={S.iot_onb_mpd}  online={S.iot_onl_mpd}  color={CYAN}   icon="⛽" />
          <FleetCard label="MPD Network — Non-IoT ROs Only" onboarded={S.non_onb_mpd} online={S.non_onl_mpd} color={YELLOW} icon="⛽" />
        </div>

        {!hasData && !loading && <EmptyState />}

        {hasData && (
          <>
            {/* ── Section 1: Distribution + Side-by-side comparison ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>

              {/* Pie */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🥧 IoT vs Non-IoT Distribution</div>
                  <div className="chart-sub">RO count by connectivity type across all {S.total_ros} outlets</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={100} innerRadius={48}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        labelLine
                      >
                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                      </Pie>
                      <Tooltip {...TT} formatter={v => [v, "ROs"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⚡ IoT vs Non-IoT — Head to Head</div>
                  <div className="chart-sub">Key BPCL fleet metrics compared between connectivity types</div>
                  <div style={{ marginTop: 20 }}>
                    <CompareBar label="MPD Online %" iotVal={I.mpd_online_pct} nonVal={N.mpd_online_pct} />
                    <CompareBar label="Tank Online %" iotVal={I.tank_online_pct} nonVal={N.tank_online_pct} />
                    <CompareBar label="Avg MPD Utilization %" iotVal={I.avg_mpd_util} nonVal={N.avg_mpd_util} />
                    <CompareBar label="Fully Online ROs" iotVal={I.fully_pct} nonVal={N.fully_pct} />
                    <CompareBar label="Offline ROs" iotVal={I.offline_pct} nonVal={N.offline_pct} />
                  </div>
                  {/* Sample sizes */}
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 8, display: "flex", gap: 28 }}>
                    <div><span style={{ color: CYAN, fontWeight: 800 }}>{I.ro_count ?? 0}</span> <span style={{ fontSize: "0.72rem", color: "#64748B" }}>IoT ROs</span></div>
                    <div><span style={{ color: YELLOW, fontWeight: 800 }}>{N.ro_count ?? 0}</span> <span style={{ fontSize: "0.72rem", color: "#64748B" }}>Non-IoT ROs</span></div>
                    <div><span style={{ color: GREEN, fontWeight: 800 }}>{I.onb_mpd ?? 0}</span> <span style={{ fontSize: "0.72rem", color: "#64748B" }}>IoT MPDs</span></div>
                    <div><span style={{ color: YELLOW, fontWeight: 800 }}>{N.onb_mpd ?? 0}</span> <span style={{ fontSize: "0.72rem", color: "#64748B" }}>Non-IoT MPDs</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: RO Status comparison side-by-side ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* IoT RO Status bar */}
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div className="chart-title">📡 IoT ROs — Status Breakdown</div>
                      <div className="chart-sub">{I.ro_count} IoT-enabled outlets by connectivity status</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "Fully Online", value: I.fully_online, pct: I.fully_pct, color: GREEN  },
                      { label: "Partial",      value: I.partial,      pct: I.partial_pct, color: YELLOW },
                      { label: "Offline",      value: I.offline_ros,  pct: I.offline_pct, color: RED    },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "14px 8px", background: `${s.color}10`, border: `1px solid ${s.color}33`, borderRadius: 10 }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value ?? "—"}</div>
                        <div style={{ fontSize: "0.68rem", color: s.color, fontWeight: 700, marginTop: 2 }}>{s.pct ?? 0}%</div>
                        <div style={{ fontSize: "0.65rem", color: "#64748B", marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* MPD and Tank summary */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* MPD Stats */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { l: "MPD Boarded", v: I.onb_mpd,  c: CYAN   },
                        { l: "MPD Online",  v: I.onl_mpd,  c: GREEN  },
                        { l: "MPD Offline", v: I.off_mpd,  c: RED    },
                        { l: "MPD Online%", v: I.mpd_online_pct != null ? `${Math.round(I.mpd_online_pct)}%` : "—", c: CYAN },
                      ].map(x => (
                        <div key={x.l} style={{ flex: 1, textAlign: "center", padding: "10px 4px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: x.c }}>{x.v ?? "—"}</div>
                          <div style={{ fontSize: "0.58rem", color: "#64748B", marginTop: 3 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Tank Stats */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { l: "Tank Boarded", v: I.onb_tank, c: PURPLE },
                        { l: "Tank Online",  v: I.onl_tank, c: GREEN  },
                        { l: "Tank Offline", v: I.off_tank, c: RED    },
                        { l: "Tank Online%", v: I.tank_online_pct != null ? `${Math.round(I.tank_online_pct)}%` : "—", c: PURPLE },
                      ].map(x => (
                        <div key={x.l} style={{ flex: 1, textAlign: "center", padding: "10px 4px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: x.c }}>{x.v ?? "—"}</div>
                          <div style={{ fontSize: "0.58rem", color: "#64748B", marginTop: 3 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-IoT RO Status bar */}
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div className="chart-title">🔌 Non-IoT ROs — Status Breakdown</div>
                      <div className="chart-sub">{N.ro_count} Non-IoT outlets by connectivity status</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "Fully Online", value: N.fully_online, pct: N.fully_pct, color: GREEN  },
                      { label: "Partial",      value: N.partial,      pct: N.partial_pct, color: YELLOW },
                      { label: "Offline",      value: N.offline_ros,  pct: N.offline_pct, color: RED    },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "14px 8px", background: `${s.color}10`, border: `1px solid ${s.color}33`, borderRadius: 10 }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value ?? "—"}</div>
                        <div style={{ fontSize: "0.68rem", color: s.color, fontWeight: 700, marginTop: 2 }}>{s.pct ?? 0}%</div>
                        <div style={{ fontSize: "0.65rem", color: "#64748B", marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* MPD and Tank summary */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* MPD Stats */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { l: "MPD Boarded", v: N.onb_mpd,  c: YELLOW },
                        { l: "MPD Online",  v: N.onl_mpd,  c: GREEN  },
                        { l: "MPD Offline", v: N.off_mpd,  c: RED    },
                        { l: "MPD Online%", v: N.non_mpd_online_pct != null ? `${Math.round(N.non_mpd_online_pct)}%` : "—", c: YELLOW },
                      ].map(x => (
                        <div key={x.l} style={{ flex: 1, textAlign: "center", padding: "10px 4px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: x.c }}>{x.v ?? "—"}</div>
                          <div style={{ fontSize: "0.58rem", color: "#64748B", marginTop: 3 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Tank Stats */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { l: "Tank Boarded", v: N.onb_tank, c: PURPLE },
                        { l: "Tank Online",  v: N.onl_tank, c: GREEN  },
                        { l: "Tank Offline", v: N.off_tank, c: RED    },
                        { l: "Tank Online%", v: N.tank_online_pct != null ? `${Math.round(N.tank_online_pct)}%` : "—", c: PURPLE },
                      ].map(x => (
                        <div key={x.l} style={{ flex: 1, textAlign: "center", padding: "10px 4px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: x.c }}>{x.v ?? "—"}</div>
                          <div style={{ fontSize: "0.58rem", color: "#64748B", marginTop: 3 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Charts ── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* IoT ROs by area (grouped) */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">📊 IoT Penetration by Sales Area</div>
                  <div className="chart-sub">IoT vs Non-IoT RO count per sales area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={areaRoBar} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="IoT ROs"     fill={CYAN}   fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="Non-IoT ROs" fill={YELLOW} fillOpacity={0.75} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MPD Online% IoT vs Non-IoT per area */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">⛽ MPD Online % — IoT vs Non-IoT by Area</div>
                  <div className="chart-sub">Compares MPD connectivity for IoT vs Non-IoT outlets within each area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={areaMpdBar} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} unit="%" />
                      <Tooltip {...TT} formatter={v => v != null ? [`${v}%`, ""] : ["—", ""]} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="IoT MPD Online%"     fill={CYAN}   fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="Non-IoT MPD Online%" fill={YELLOW} fillOpacity={0.75} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* IoT by Vendor */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🏢 IoT Penetration by Vendor</div>
                  <div className="chart-sub">IoT vs Non-IoT RO count per RA Vendor</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={vendorBar} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                      <Tooltip {...TT} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="IoT ROs"     fill={CYAN}   fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="Non-IoT ROs" fill={YELLOW} fillOpacity={0.75} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tank Online% IoT vs Non-IoT per area */}
              <div className="card">
                <div className="card-body">
                  <div className="chart-title">🛢️ Tank Online % — IoT vs Non-IoT by Area</div>
                  <div className="chart-sub">Compares Tank connectivity for IoT vs Non-IoT outlets within each area</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={areaTankBar} margin={{ top: 5, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} unit="%" />
                      <Tooltip {...TT} formatter={v => v != null ? [`${v}%`, ""] : ["—", ""]} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 10 }} />
                      <Bar dataKey="IoT Tank Online%"     fill={PURPLE} fillOpacity={0.85} radius={[4,4,0,0]} />
                      <Bar dataKey="Non-IoT Tank Online%" fill={YELLOW} fillOpacity={0.75} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Section 4: Full Area Detail Table ── */}
            <div className="card">
              <div className="card-body">
                <div style={{ marginBottom: 16 }}>
                  <div className="chart-title">📋 Sales Area — IoT vs Non-IoT Full Comparison</div>
                  <div className="chart-sub">Detailed breakdown of RO status and MPD connectivity for each group per sales area</div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ verticalAlign: "bottom" }}>Sales Area</th>
                        <th rowSpan={2} style={{ textAlign: "center", verticalAlign: "bottom" }}>Total ROs</th>
                        <th colSpan={6} style={{ textAlign: "center", color: CYAN, borderBottom: "1px solid rgba(0,229,255,0.2)" }}>📡 IoT Enabled</th>
                        <th colSpan={6} style={{ textAlign: "center", color: YELLOW, borderBottom: "1px solid rgba(245,158,11,0.2)" }}>🔌 Non-IoT</th>
                        <th rowSpan={2} style={{ textAlign: "center", verticalAlign: "bottom", minWidth: 80 }}>MPD Gap</th>
                        <th rowSpan={2} style={{ textAlign: "center", verticalAlign: "bottom", minWidth: 80 }}>Tank Gap</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "center", color: CYAN, fontSize: "0.68rem" }}>ROs</th>
                        <th style={{ textAlign: "center", color: GREEN, fontSize: "0.68rem" }}>Fully On</th>
                        <th style={{ textAlign: "center", color: YELLOW, fontSize: "0.68rem" }}>Partial</th>
                        <th style={{ textAlign: "center", color: RED, fontSize: "0.68rem" }}>Offline</th>
                        <th style={{ minWidth: 110, fontSize: "0.68rem", color: CYAN }}>MPD Online%</th>
                        <th style={{ minWidth: 110, fontSize: "0.68rem", color: PURPLE }}>Tank Online%</th>
                        <th style={{ textAlign: "center", color: YELLOW, fontSize: "0.68rem" }}>ROs</th>
                        <th style={{ textAlign: "center", color: GREEN, fontSize: "0.68rem" }}>Fully On</th>
                        <th style={{ textAlign: "center", color: YELLOW, fontSize: "0.68rem" }}>Partial</th>
                        <th style={{ textAlign: "center", color: RED, fontSize: "0.68rem" }}>Offline</th>
                        <th style={{ minWidth: 110, fontSize: "0.68rem", color: YELLOW }}>MPD Online%</th>
                        <th style={{ minWidth: 110, fontSize: "0.68rem", color: PURPLE }}>Tank Online%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byArea.map(a => {
                        const gap     = a.mpd_gap;
                        const gapColor = gap == null ? "#475569" : gap >= 0 ? GREEN : RED;
                        const tGap     = a.tank_gap;
                        const tGapColor = tGap == null ? "#475569" : tGap >= 0 ? GREEN : RED;
                        return (
                          <tr key={a.sales_area}>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{a.sales_area}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{a.total_ros}</td>
                            {/* IoT */}
                            <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.iot_ros}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.iot_fully}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{a.iot_partial}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: a.iot_offline > 0 ? RED : "#475569" }}>{a.iot_offline}</td>
                            <td>{badge(a.iot_mpd_pct)}</td>
                            <td>{badge(a.iot_tank_pct)}</td>
                            {/* Non-IoT */}
                            <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{a.non_iot_ros}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.non_fully}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{a.non_partial}</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: a.non_offline > 0 ? RED : "#475569" }}>{a.non_offline}</td>
                            <td>{badge(a.non_mpd_pct)}</td>
                            <td>{badge(a.non_tank_pct)}</td>
                            {/* MPD Gap */}
                            <td style={{ textAlign: "center" }}>
                              {gap != null
                                ? <span style={{ fontSize: "0.73rem", fontWeight: 700, color: gapColor, padding: "2px 8px", borderRadius: 4, background: gap >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                                    {gap >= 0 ? "▲" : "▼"} {Math.abs(gap)}%
                                  </span>
                                : <span style={{ color: "#475569" }}>—</span>
                              }
                            </td>
                            {/* Tank Gap */}
                            <td style={{ textAlign: "center" }}>
                              {tGap != null
                                ? <span style={{ fontSize: "0.73rem", fontWeight: 700, color: tGapColor, padding: "2px 8px", borderRadius: 4, background: tGap >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                                    {tGap >= 0 ? "▲" : "▼"} {Math.abs(tGap)}%
                                  </span>
                                : <span style={{ color: "#475569" }}>—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
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

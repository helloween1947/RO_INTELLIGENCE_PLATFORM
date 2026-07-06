import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter,
  ReferenceLine, Legend, PieChart, Pie
} from "recharts";
import { getFleetStatus, getDashboardSummary } from "../services/api";

const CYAN   = "#00E5FF";
const PURPLE = "#7C4DFF";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const YELLOW = "#F59E0B";

const TOOLTIP = {
  background: "#0D1F3C",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 8,
  fontSize: 12,
  color: "#F1F5F9",
};
const TOOLTIP_ITEM = { color: "#F1F5F9" };
const TOOLTIP_LABEL = { color: "#94A3B8" };

function pct(online, total) {
  if (!total || total === 0) return 0;
  return Math.round((online / total) * 100);
}

function statusColor(p) {
  if (p >= 90) return GREEN;
  if (p >= 70) return YELLOW;
  return RED;
}

/* ── KPI Tile ─────────────────────────────────────────────────────────── */
function Tile({ label, value, unit, color, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color, lineHeight: 1 }}>
        {value ?? "—"}<span style={{ fontSize: "0.9rem", color: "#94A3B8", marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ── Top / Bottom N table ─────────────────────────────────────────────── */
function RankTable({ title, sub, rows, valueKey, label, color, ascending = false }) {
  const sorted = [...rows]
    .filter(r => r[valueKey] !== null && r[valueKey] !== undefined)
    .sort((a, b) => ascending ? a[valueKey] - b[valueKey] : b[valueKey] - a[valueKey])
    .slice(0, 10);

  return (
    <div className="card">
      <div className="card-body">
        <div className="chart-title">{title}</div>
        <div className="chart-sub" style={{ marginBottom: 16 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((r, i) => {
            const val = typeof r[valueKey] === "number" ? Math.round(r[valueKey]) : r[valueKey];
            const barPct = Math.min(100, Math.max(0, val));
            const c = color || statusColor(val);
            return (
              <div key={r.site_id || i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: "0.73rem", color: "#CBD5E1", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#475569", marginRight: 6 }}>#{i + 1}</span>
                    {r.ro_name || r.ro_id}
                  </span>
                  <span style={{ fontSize: "0.73rem", fontWeight: 700, color: c }}>
                    {val}{label}
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{
                    width: `${barPct}%`, height: "100%", borderRadius: 2,
                    background: `linear-gradient(90deg, ${c}, ${c}88)`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", color: "#475569", fontSize: "0.8rem", padding: 20 }}>
              No data yet — upload BPCL Excel to populate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Utilization distribution histogram ─────────────────────────────────── */
function UtilHistogram({ sites, field, title, color }) {
  const buckets = [
    { range: "0–20%",   min: 0,  max: 20  },
    { range: "20–40%",  min: 20, max: 40  },
    { range: "40–60%",  min: 40, max: 60  },
    { range: "60–70%",  min: 60, max: 70  },
    { range: "70–80%",  min: 70, max: 80  },
    { range: "80–90%",  min: 80, max: 90  },
    { range: "90–95%",  min: 90, max: 95  },
    { range: "95–100%", min: 95, max: 101 },
  ];

  const data = buckets.map(b => ({
    range: b.range,
    count: sites.filter(s => {
      const v = s[field];
      return v !== null && v !== undefined && v >= b.min && v < b.max;
    }).length,
  }));

  return (
    <div className="card">
      <div className="card-body">
        <div className="chart-title">{title}</div>
        <div className="chart-sub" style={{ marginBottom: 12 }}>Distribution of outlets across utilization % bands</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_LABEL} formatter={(v) => [v, "Outlets"]} />
            <Bar dataKey="count" name="Outlets" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.count === 0 ? "rgba(255,255,255,0.04)" : (i >= 5 ? GREEN : i >= 3 ? YELLOW : RED)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Online vs Offline Pie ────────────────────────────────────────────── */
function FleetPie({ onboarded, online, label, color }) {
  const offline = (onboarded || 0) - (online || 0);
  const data = [
    { name: "Online",  value: online  || 0 },
    { name: "Offline", value: offline || 0 },
  ];
  const p = onboarded > 0 ? Math.round((online / onboarded) * 100) : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <PieChart width={130} height={130}>
          <Pie data={data} cx={60} cy={60} innerRadius={40} outerRadius={58} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="rgba(255,255,255,0.06)" />
          </Pie>
        </PieChart>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          fontSize: "1.1rem", fontWeight: 800, color,
        }}>
          {p}%
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: "0.68rem", color: GREEN }}>● {online ?? 0} Online</span>
        <span style={{ fontSize: "0.68rem", color: RED }}>● {offline} Offline</span>
      </div>
    </div>
  );
}

/* ── Offline Hotspot table ────────────────────────────────────────────── */
function OfflineHotspots({ sites }) {
  const withOffline = sites
    .filter(s => (s.offline_mpds || 0) + (s.offline_tanks || 0) > 0)
    .map(s => ({
      ...s,
      total_offline: (s.offline_mpds || 0) + (s.offline_tanks || 0),
    }))
    .sort((a, b) => b.total_offline - a.total_offline)
    .slice(0, 15);

  return (
    <div className="card" style={{ gridColumn: "span 2" }}>
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="chart-title">🔴 Offline Hotspots — Sites Needing Attention</div>
            <div className="chart-sub">Outlets with the most offline MPDs + Tanks combined</div>
          </div>
          <span style={{
            fontSize: "0.72rem", padding: "4px 12px", borderRadius: 4,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: RED, fontWeight: 700,
          }}>
            {withOffline.length} outlets affected
          </span>
        </div>
        {withOffline.length === 0 ? (
          <div style={{ textAlign: "center", color: "#10B981", padding: 30, fontSize: "0.85rem" }}>
            ✅ No offline units detected — all sites reporting healthy
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Retail Outlet</th>
                  <th>RO ID</th>
                  <th style={{ color: CYAN }}>MPD Boarded</th>
                  <th style={{ color: GREEN }}>MPD Online</th>
                  <th style={{ color: RED }}>MPD Offline</th>
                  <th style={{ color: PURPLE }}>Tank Boarded</th>
                  <th style={{ color: GREEN }}>Tank Online</th>
                  <th style={{ color: RED }}>Tank Offline</th>
                  <th>MPD Util%</th>
                  <th>Tank Util%</th>
                </tr>
              </thead>
              <tbody>
                {withOffline.map((s, i) => (
                  <tr key={s.site_id}>
                    <td style={{ color: "#475569", fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: "#E2E8F0", maxWidth: 180 }}>{s.ro_name}</td>
                    <td><span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: CYAN }}>{s.ro_id}</span></td>
                    <td style={{ textAlign: "center", color: CYAN, fontWeight: 700 }}>{s.onboarded_mpds ?? "—"}</td>
                    <td style={{ textAlign: "center", color: GREEN, fontWeight: 700 }}>{s.online_mpds ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: s.offline_mpds > 0 ? RED : "#475569" }}>{s.offline_mpds ?? "—"}</td>
                    <td style={{ textAlign: "center", color: PURPLE, fontWeight: 700 }}>{s.onboarded_tanks ?? "—"}</td>
                    <td style={{ textAlign: "center", color: GREEN, fontWeight: 700 }}>{s.online_tanks ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: s.offline_tanks > 0 ? RED : "#475569" }}>{s.offline_tanks ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      {s.mpd_uptime != null ? (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColor(s.mpd_uptime) }}>{Math.round(s.mpd_uptime)}%</span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {s.tank_uptime != null ? (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColor(s.tank_uptime) }}>{Math.round(s.tank_uptime)}%</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function Analytics() {
  const [fleet,   setFleet]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");

  const load = useCallback(async () => {
    try {
      const [f, s] = await Promise.allSettled([getFleetStatus(), getDashboardSummary()]);
      if (f.status === "fulfilled") setFleet(f.value.data);
      if (s.status === "fulfilled") setSummary(s.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const S = summary || {};

  // Fleet-level aggregates from fleet data
  const totalOnboardedMPD  = fleet.reduce((a, s) => a + (s.onboarded_mpds  || 0), 0);
  const totalOnlineMPD     = fleet.reduce((a, s) => a + (s.online_mpds     || 0), 0);
  const totalOfflineMPD    = fleet.reduce((a, s) => a + (s.offline_mpds    || 0), 0);
  const totalOnboardedTank = fleet.reduce((a, s) => a + (s.onboarded_tanks || 0), 0);
  const totalOnlineTank    = fleet.reduce((a, s) => a + (s.online_tanks    || 0), 0);
  const totalOfflineTank   = fleet.reduce((a, s) => a + (s.offline_tanks   || 0), 0);

  const avgMPDUtil  = fleet.filter(s => s.mpd_uptime  != null).reduce((a, s, _, arr) => a + s.mpd_uptime  / arr.length, 0);
  const avgTankUtil = fleet.filter(s => s.tank_uptime != null).reduce((a, s, _, arr) => a + s.tank_uptime / arr.length, 0);

  const sitesAbove90MPD  = fleet.filter(s => pct(s.online_mpds, s.onboarded_mpds) >= 90).length;
  const sitesBelow70MPD  = fleet.filter(s => s.onboarded_mpds > 0 && pct(s.online_mpds, s.onboarded_mpds) < 70).length;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📊 Fleet Analytics</span>
        <div className="topbar-right">
          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>{fleet.length} sites loaded</span>
          <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-inner">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {/* ── Fleet Status Pies ──────────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-around",
              padding: "20px 24px", marginBottom: 20,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12,
            }}>
              <FleetPie onboarded={totalOnboardedMPD}  online={totalOnlineMPD}  label="MPD Fleet"  color={CYAN} />
              <div style={{ width: 1, height: 100, background: "rgba(255,255,255,0.07)" }} />
              <FleetPie onboarded={totalOnboardedTank} online={totalOnlineTank} label="Tank Fleet" color={PURPLE} />
              <div style={{ width: 1, height: 100, background: "rgba(255,255,255,0.07)" }} />

              {/* Text KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px" }}>
                {[
                  { label: "Avg MPD Util",  value: `${Math.round(avgMPDUtil)}%`,   color: CYAN },
                  { label: "Avg Tank Util", value: `${Math.round(avgTankUtil)}%`,  color: PURPLE },
                  { label: "Sites ≥ 90% MPD", value: sitesAbove90MPD, color: GREEN },
                  { label: "Sites < 70% MPD", value: sitesBelow70MPD, color: RED },
                  { label: "Total Outlets",  value: fleet.length,   color: "#94A3B8" },
                  { label: "Total MPDs",     value: totalOnboardedMPD,  color: CYAN },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────── */}
            <div className="tabs" style={{ marginBottom: 16 }}>
              {[
                ["overview",  "📈 Performance Rankings"],
                ["hotspots",  "🔴 Offline Hotspots"],
                ["distribution", "📊 Utilization Distribution"],
              ].map(([key, label]) => (
                <button key={key} className={`tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Performance Intelligence ─────────────────────────────── */}
            {tab === "overview" && (() => {
              /* ── derive area scorecard ── */
              const areaMap = {};
              fleet.forEach(s => {
                const a = s.sales_area || "Unknown";
                if (!areaMap[a]) areaMap[a] = {
                  name: a, total: 0,
                  fullyOnline: 0, partial: 0, offline: 0,
                  onbMPD: 0, onlMPD: 0, onbTank: 0, onlTank: 0,
                };
                areaMap[a].total++;
                if (s.ro_status === "Fully Online")     areaMap[a].fullyOnline++;
                else if (s.ro_status === "Partially Online") areaMap[a].partial++;
                else if (s.ro_status === "Offline")     areaMap[a].offline++;
                areaMap[a].onbMPD  += s.onboarded_mpds  || 0;
                areaMap[a].onlMPD  += s.online_mpds     || 0;
                areaMap[a].onbTank += s.onboarded_tanks || 0;
                areaMap[a].onlTank += s.online_tanks    || 0;
              });
              const areas = Object.values(areaMap).map(a => ({
                ...a,
                mpdPct:  a.onbMPD  > 0 ? Math.min(100, Math.round(a.onlMPD  / a.onbMPD  * 100)) : 0,
                tankPct: a.onbTank > 0 ? Math.min(100, Math.round(a.onlTank / a.onbTank * 100)) : 0,
                offMPD:  Math.max(0, a.onbMPD  - a.onlMPD),
                offTank: Math.max(0, a.onbTank - a.onlTank),
                fullyPct: a.total > 0 ? Math.round(a.fullyOnline / a.total * 100) : 0,
              })).sort((a, b) => b.total - a.total);

              /* ── derive vendor matrix ── */
              const vendMap = {};
              fleet.forEach(s => {
                const v = s.vendor_name || "Unknown";
                if (!vendMap[v]) vendMap[v] = {
                  name: v, ros: 0, fullyOnline: 0, partial: 0, offline: 0,
                  onbMPD: 0, onlMPD: 0, onbTank: 0, onlTank: 0,
                };
                vendMap[v].ros++;
                if (s.ro_status === "Fully Online")          vendMap[v].fullyOnline++;
                else if (s.ro_status === "Partially Online") vendMap[v].partial++;
                else if (s.ro_status === "Offline")          vendMap[v].offline++;
                vendMap[v].onbMPD  += s.onboarded_mpds  || 0;
                vendMap[v].onlMPD  += s.online_mpds     || 0;
                vendMap[v].onbTank += s.onboarded_tanks || 0;
                vendMap[v].onlTank += s.online_tanks    || 0;
              });
              const vendors = Object.values(vendMap).map(v => ({
                ...v,
                mpdPct:  v.onbMPD  > 0 ? Math.min(100, Math.round(v.onlMPD  / v.onbMPD  * 100)) : 0,
                tankPct: v.onbTank > 0 ? Math.min(100, Math.round(v.onlTank / v.onbTank * 100)) : 0,
                offMPD:  Math.max(0, v.onbMPD  - v.onlMPD),
                offTank: Math.max(0, v.onbTank - v.onlTank),
              })).sort((a, b) => b.ros - a.ros);

              /* ── ROs needing action (Offline + Partial, sorted by most offline MPDs) ── */
              const actionROs = [...fleet]
                .filter(s => s.ro_status === "Offline" || s.ro_status === "Partially Online")
                .map(s => ({
                  ...s,
                  offMPD:  Math.max(0, (s.onboarded_mpds  || 0) - (s.online_mpds  || 0)),
                  offTank: Math.max(0, (s.onboarded_tanks || 0) - (s.online_tanks || 0)),
                  mpdPct:  s.onboarded_mpds  > 0 ? Math.min(100, Math.round(((s.online_mpds  || 0) / s.onboarded_mpds)  * 100)) : 0,
                  tankPct: s.onboarded_tanks > 0 ? Math.min(100, Math.round(((s.online_tanks || 0) / s.onboarded_tanks) * 100)) : 0,
                }))
                .sort((a, b) => {
                  if (a.ro_status === "Offline" && b.ro_status !== "Offline") return -1;
                  if (b.ro_status === "Offline" && a.ro_status !== "Offline") return 1;
                  return b.offMPD - a.offMPD;
                });

              const pctBar = (v, color) => (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color }}>{v}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                    <div style={{
                      width: `${v}%`, height: "100%", borderRadius: 3,
                      background: `linear-gradient(90deg, ${color}, ${color}77)`,
                      transition: "width 0.7s ease",
                    }} />
                  </div>
                </div>
              );

              const statusBadge = (v, total) => {
                if (!v || !total) return null;
                const p = Math.round(v / total * 100);
                return <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>({p}%)</span>;
              };

              return (
                <>
                  {/* ══ 1. Sales Area Scorecard ═══════════════════════════════════ */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                        <div>
                          <div className="chart-title">🗺 Sales Area — Performance Scorecard</div>
                          <div className="chart-sub">RO status, MPD & Tank connectivity broken down by sales area</div>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{areas.length} sales areas</span>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Sales Area</th>
                              <th style={{ textAlign: "center" }}>Total ROs</th>
                              <th style={{ textAlign: "center", color: GREEN }}>Fully Online</th>
                              <th style={{ textAlign: "center", color: YELLOW }}>Partially Online</th>
                              <th style={{ textAlign: "center", color: RED }}>Offline</th>
                              <th style={{ textAlign: "center" }}>RO Health</th>
                              <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                              <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                              <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                              <th style={{ minWidth: 120 }}>MPD Online %</th>
                              <th style={{ textAlign: "center", color: PURPLE }}>Tank Boarded</th>
                              <th style={{ textAlign: "center", color: GREEN }}>Tank Online</th>
                              <th style={{ textAlign: "center", color: RED }}>Tank Offline</th>
                              <th style={{ minWidth: 120 }}>Tank Online %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {areas.map(a => (
                              <tr key={a.name}>
                                <td style={{ fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{a.name}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.total}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.fullyOnline} {statusBadge(a.fullyOnline, a.total)}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{a.partial} {statusBadge(a.partial, a.total)}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: a.offline > 0 ? RED : "#475569" }}>{a.offline} {a.offline > 0 && statusBadge(a.offline, a.total)}</td>
                                <td style={{ minWidth: 100 }}>
                                  {pctBar(a.fullyPct, a.fullyPct >= 50 ? GREEN : a.fullyPct >= 30 ? YELLOW : RED)}
                                </td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{a.onbMPD}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.onlMPD}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: a.offMPD > 0 ? RED : "#475569" }}>{a.offMPD}</td>
                                <td style={{ minWidth: 120 }}>{pctBar(a.mpdPct, a.mpdPct >= 90 ? GREEN : a.mpdPct >= 70 ? YELLOW : RED)}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{a.onbTank}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{a.onlTank}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: a.offTank > 0 ? RED : "#475569" }}>{a.offTank}</td>
                                <td style={{ minWidth: 120 }}>{pctBar(a.tankPct, a.tankPct >= 90 ? GREEN : a.tankPct >= 70 ? YELLOW : RED)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ══ 2. Vendor Health Matrix ═══════════════════════════════════ */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-body">
                      <div style={{ marginBottom: 18 }}>
                        <div className="chart-title">🏢 RA Vendor — Health Matrix</div>
                        <div className="chart-sub">Vendor-level MPD & Tank connectivity performance and RO status breakdown</div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>RA Vendor</th>
                              <th style={{ textAlign: "center" }}>ROs</th>
                              <th style={{ textAlign: "center", color: GREEN }}>Fully Online</th>
                              <th style={{ textAlign: "center", color: YELLOW }}>Partial</th>
                              <th style={{ textAlign: "center", color: RED }}>Offline</th>
                              <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                              <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                              <th style={{ minWidth: 130 }}>MPD Online %</th>
                              <th style={{ textAlign: "center", color: PURPLE }}>Tank Boarded</th>
                              <th style={{ textAlign: "center", color: RED }}>Tank Offline</th>
                              <th style={{ minWidth: 130 }}>Tank Online %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendors.map(v => (
                              <tr key={v.name}>
                                <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v.name}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{v.ros}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{v.fullyOnline}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: YELLOW }}>{v.partial}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: v.offline > 0 ? RED : "#475569" }}>{v.offline}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{v.onbMPD}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: v.offMPD > 0 ? RED : "#475569" }}>{v.offMPD}</td>
                                <td style={{ minWidth: 130 }}>{pctBar(v.mpdPct, v.mpdPct >= 90 ? GREEN : v.mpdPct >= 70 ? YELLOW : RED)}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{v.onbTank}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: v.offTank > 0 ? RED : "#475569" }}>{v.offTank}</td>
                                <td style={{ minWidth: 130 }}>{pctBar(v.tankPct, v.tankPct >= 90 ? GREEN : v.tankPct >= 70 ? YELLOW : RED)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ══ 3. Action List — ROs Needing Attention ═══════════════════ */}
                  <div className="card">
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div className="chart-title">🚨 ROs Requiring Immediate Attention</div>
                          <div className="chart-sub">Offline + Partially Online ROs sorted by severity — prioritise these for field action</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: "0.72rem", padding: "4px 10px", borderRadius: 4, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: RED, fontWeight: 700 }}>
                            {actionROs.filter(r => r.ro_status === "Offline").length} Offline
                          </span>
                          <span style={{ fontSize: "0.72rem", padding: "4px 10px", borderRadius: 4, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: YELLOW, fontWeight: 700 }}>
                            {actionROs.filter(r => r.ro_status === "Partially Online").length} Partial
                          </span>
                        </div>
                      </div>
                      {actionROs.length === 0 ? (
                        <div style={{ textAlign: "center", color: GREEN, padding: 40, fontSize: "0.9rem" }}>
                          ✅ All ROs reporting healthy — no action required!
                        </div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>RO ID</th>
                                <th>Retail Outlet</th>
                                <th>Sales Area</th>
                                <th>RA Vendor</th>
                                <th>IoT</th>
                                <th style={{ color: CYAN }}>MPD Boarded</th>
                                <th style={{ color: GREEN }}>MPD Online</th>
                                <th style={{ color: RED }}>MPD Offline</th>
                                <th>MPD %</th>
                                <th style={{ color: PURPLE }}>Tank Boarded</th>
                                <th style={{ color: GREEN }}>Tank Online</th>
                                <th style={{ color: RED }}>Tank Offline</th>
                                <th>Tank %</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {actionROs.map((s, i) => {
                                const isOff = s.ro_status === "Offline";
                                const mC    = s.mpdPct  >= 90 ? GREEN : s.mpdPct  >= 70 ? YELLOW : RED;
                                const tC    = s.tankPct >= 90 ? GREEN : s.tankPct >= 70 ? YELLOW : RED;
                                const mBg   = s.mpdPct  >= 90 ? "rgba(16,185,129,0.15)" : s.mpdPct  >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                                const tBg   = s.tankPct >= 90 ? "rgba(16,185,129,0.15)" : s.tankPct >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                                return (
                                  <tr key={s.site_id} style={{ background: isOff ? "rgba(239,68,68,0.03)" : undefined }}>
                                    <td style={{ color: "#475569", fontWeight: 700 }}>{i + 1}</td>
                                    <td><span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: CYAN }}>{s.ro_id}</span></td>
                                    <td style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.ro_name}</td>
                                    <td style={{ color: "#94A3B8", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{s.sales_area || "—"}</td>
                                    <td style={{ color: "#94A3B8", fontSize: "0.75rem" }}>{s.vendor_name || "—"}</td>
                                    <td>
                                      {s.iot_enabled === true  && <span style={{ color: GREEN,   fontSize: "0.68rem", fontWeight: 700 }}>✓ IoT</span>}
                                      {s.iot_enabled === false && <span style={{ color: "#475569", fontSize: "0.68rem" }}>Non-IoT</span>}
                                      {s.iot_enabled == null  && <span style={{ color: "#475569", fontSize: "0.68rem" }}>—</span>}
                                    </td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{s.onboarded_mpds ?? "—"}</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{s.online_mpds ?? "—"}</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: s.offMPD > 0 ? RED : "#475569" }}>{s.offMPD}</td>
                                    <td><span style={{ fontSize: "0.73rem", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: mBg, color: mC }}>{s.mpdPct}%</span></td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{s.onboarded_tanks ?? "—"}</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{s.online_tanks ?? "—"}</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: s.offTank > 0 ? RED : "#475569" }}>{s.offTank}</td>
                                    <td><span style={{ fontSize: "0.73rem", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: tBg, color: tC }}>{s.tankPct}%</span></td>
                                    <td>
                                      <span style={{
                                        fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                                        background: isOff ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.12)",
                                        color: isOff ? RED : YELLOW, whiteSpace: "nowrap",
                                        border: `1px solid ${isOff ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                                      }}>
                                        {isOff ? "🔴 Offline" : "🟡 Partial"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ── Hotspots ────────────────────────────────────────── */}
            {tab === "hotspots" && (
              <div className="grid-2">
                <OfflineHotspots sites={fleet} />
                <RankTable
                  title="🔴 Most Offline MPDs"
                  sub="Outlets with the highest count of offline MPDs"
                  rows={fleet}
                  valueKey="offline_mpds"
                  label=" offline"
                  color={RED}
                />
                <RankTable
                  title="🔴 Most Offline Tanks"
                  sub="Outlets with the highest count of offline Tanks"
                  rows={fleet}
                  valueKey="offline_tanks"
                  label=" offline"
                  color={YELLOW}
                />
              </div>
            )}

            {/* ── Distribution ─────────────────────────────────────── */}
            {tab === "distribution" && (
              <div className="grid-2">
                <UtilHistogram sites={fleet} field="mpd_uptime"  title="MPD Utilization % Distribution" color={CYAN} />
                <UtilHistogram sites={fleet} field="tank_uptime" title="Tank Utilization % Distribution" color={PURPLE} />

                {/* Summary tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, gridColumn: "span 2" }}>
                  <Tile label="Total On-Boarded MPDs"  value={totalOnboardedMPD}  color={CYAN}   sub="Across all outlets" />
                  <Tile label="Total Online MPDs"       value={totalOnlineMPD}     color={GREEN}  sub={`${pct(totalOnlineMPD, totalOnboardedMPD)}% of fleet`} />
                  <Tile label="Total Offline MPDs"      value={totalOfflineMPD}    color={RED}    sub="Needs attention" />
                  <Tile label="Total On-Boarded Tanks"  value={totalOnboardedTank} color={PURPLE} sub="Across all outlets" />
                  <Tile label="Total Online Tanks"      value={totalOnlineTank}    color={GREEN}  sub={`${pct(totalOnlineTank, totalOnboardedTank)}% of fleet`} />
                  <Tile label="Total Offline Tanks"     value={totalOfflineTank}   color={YELLOW} sub="Needs attention" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

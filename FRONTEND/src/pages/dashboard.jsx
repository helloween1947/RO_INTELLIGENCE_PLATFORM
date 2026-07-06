import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  getDashboardSummary, getFleetStatus, clearAllData,
} from "../services/api";
import toast from "react-hot-toast";

const TOOLTIP_STYLE = {
  background: "#0D1F3C",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 8,
  fontSize: 12,
  color: "#F1F5F9",
};
const TOOLTIP_ITEM_STYLE = { color: "#F1F5F9" };
const TOOLTIP_LABEL_STYLE = { color: "#94A3B8" };

const GREEN  = "#10B981";
const RED    = "#EF4444";
const CYAN   = "#00E5FF";
const PURPLE = "#7C4DFF";
const YELLOW = "#F59E0B";
const ORANGE = "#F97316";

/* ── small KPI tile ───────────────────────────────────────────────────── */
function KPICard({ label, value, unit, sub, accent = CYAN, icon }) {
  return (
    <div className="kpi-card" style={{ "--accent": accent }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value ?? "—"}
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      {sub  && <div className="kpi-sub">{sub}</div>}
      {icon && <div className="kpi-icon">{icon}</div>}
    </div>
  );
}

/* ── Fleet count card (Onboarded / Online / Offline / %) ─────────────── */
function FleetCard({ label, onboarded, online, color, icon }) {
  const offline = (onboarded != null && online != null)
    ? Math.max(0, onboarded - online) : null;
  const pct = onboarded > 0 ? Math.min(100, Math.round((online / onboarded) * 100)) : 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "18px 22px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1.1, marginTop: 4 }}>
            {onboarded ?? "—"}
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginLeft: 4 }}>on-boarded</span>
          </div>
        </div>
        <span style={{ fontSize: "1.6rem", opacity: 0.5 }}>{icon}</span>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.65rem", color: GREEN, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>● Online</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: GREEN }}>{online ?? "—"}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.65rem", color: RED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>● Offline</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: RED }}>{offline ?? "—"}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.65rem", color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Online %</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color }}>{pct}%</div>
        </div>
      </div>

      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

/* ── RO Status breakdown card ─────────────────────────────────────────── */
function ROStatusCard({ fleet }) {
  const fullyOnline    = fleet.filter(s => s.ro_status === "Fully Online").length;
  const partialOnline  = fleet.filter(s => s.ro_status === "Partially Online").length;
  const offline        = fleet.filter(s => s.ro_status === "Offline").length;
  const unknown        = fleet.length - fullyOnline - partialOnline - offline;
  const total          = fleet.length;

  const rows = [
    { label: "Fully Online",     value: fullyOnline,   color: GREEN,  pct: total > 0 ? Math.round(fullyOnline   / total * 100) : 0 },
    { label: "Partially Online", value: partialOnline, color: YELLOW, pct: total > 0 ? Math.round(partialOnline / total * 100) : 0 },
    { label: "Offline",          value: offline,        color: RED,    pct: total > 0 ? Math.round(offline       / total * 100) : 0 },
    ...(unknown > 0 ? [{ label: "Unknown", value: unknown, color: "#475569", pct: total > 0 ? Math.round(unknown / total * 100) : 0 }] : []),
  ];

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "18px 22px",
    }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
        🏭 RO Status Breakdown
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.78rem", color: r.color, fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: r.color }}>
                {r.value} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({r.pct}%)</span>
              </span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
              <div style={{
                width: `${r.pct}%`, height: "100%", borderRadius: 3,
                background: `linear-gradient(90deg, ${r.color}, ${r.color}66)`,
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Fleet Table ──────────────────────────────────────────────────────── */
function FleetTable({ sites }) {
  const [search, setSearch] = useState("");
  const filtered = sites.filter(s =>
    s.ro_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.ro_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.sales_area?.toLowerCase().includes(search.toLowerCase()) ||
    s.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (st) => {
    if (!st) return "#64748B";
    if (st === "Fully Online")    return GREEN;
    if (st === "Partially Online") return YELLOW;
    if (st === "Offline")          return RED;
    return "#64748B";
  };

  const pctBadge = (v) => {
    if (v == null) return "—";
    const c  = v >= 90 ? GREEN : v >= 70 ? YELLOW : RED;
    const bg = v >= 90 ? "rgba(16,185,129,0.15)" : v >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
    return <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color: c }}>{v}%</span>;
  };

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="chart-title">Fleet Status — All Retail Outlets</div>
            <div className="chart-sub">{sites.length} ROs with MPD & Tank data</div>
          </div>
          <input
            className="input"
            placeholder="Search RO / area / vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RO ID</th>
                <th>Retail Outlet</th>
                <th>Sales Area</th>
                <th>Vendor</th>
                <th>IoT</th>
                <th style={{ color: CYAN }}>MPD Boarded</th>
                <th style={{ color: GREEN }}>MPD Online</th>
                <th style={{ color: RED }}>MPD Offline</th>
                <th style={{ color: CYAN }}>MPD%</th>
                <th style={{ color: PURPLE }}>Tank Boarded</th>
                <th style={{ color: GREEN }}>Tank Online</th>
                <th style={{ color: RED }}>Tank Offline</th>
                <th style={{ color: PURPLE }}>Tank%</th>
                <th>RO Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(s => {
                const offMpd  = (s.onboarded_mpds  != null && s.online_mpds  != null) ? Math.max(0, s.onboarded_mpds  - s.online_mpds)  : null;
                const offTank = (s.onboarded_tanks != null && s.online_tanks != null) ? Math.max(0, s.onboarded_tanks - s.online_tanks) : null;
                const mpdPct  = s.onboarded_mpds  > 0 ? Math.min(100, Math.round(((s.online_mpds  || 0) / s.onboarded_mpds)  * 100)) : null;
                const tankPct = s.onboarded_tanks > 0 ? Math.min(100, Math.round(((s.online_tanks || 0) / s.onboarded_tanks) * 100)) : null;
                return (
                  <tr key={s.site_id}>
                    <td><span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: CYAN }}>{s.ro_id}</span></td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: 200 }}>{s.ro_name}</td>
                    <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{s.sales_area || "—"}</td>
                    <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{s.vendor_name || "—"}</td>
                    <td>
                      {s.iot_enabled === true  && <span style={{ color: GREEN,   fontSize: "0.72rem", fontWeight: 700 }}>✓ IoT</span>}
                      {s.iot_enabled === false && <span style={{ color: "#475569", fontSize: "0.72rem" }}>Non-IoT</span>}
                      {s.iot_enabled == null   && <span style={{ color: "#475569", fontSize: "0.72rem" }}>—</span>}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: CYAN }}>{s.onboarded_mpds ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{s.online_mpds ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: offMpd > 0 ? RED : "#64748B" }}>{offMpd ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{pctBadge(mpdPct)}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: PURPLE }}>{s.onboarded_tanks ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{s.online_tanks ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: offTank > 0 ? RED : "#64748B" }}>{offTank ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{pctBadge(tankPct)}</td>
                    <td>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: statusColor(s.ro_status) }}>
                        {s.ro_status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Showing 100 of {filtered.length} outlets
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [fleet,   setFleet]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");

  const load = useCallback(async () => {
    try {
      const [s, f] = await Promise.allSettled([
        getDashboardSummary(),
        getFleetStatus(),
      ]);
      if (s.status === "fulfilled") setSummary(s.value.data);
      if (f.status === "fulfilled") setFleet(f.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [load]);

  const handleClear = async () => {
    if (!window.confirm("Delete ALL data? This cannot be undone.")) return;
    try {
      const r = await clearAllData();
      const d = r.data.deleted;
      toast.success(`Cleared: ${d.sites} sites, ${d.readings} readings`, { duration: 4000 });
      setSummary(null); setFleet([]);
      load();
    } catch { toast.error("Clear failed — is backend running?"); }
  };

  const S = summary || {};
  const hasData = fleet.length > 0;

  /* ── Derived data from real fleet ─────────────────────────────────── */

  // RO Status pie data
  const roStatusPie = useMemo(() => {
    const fully   = fleet.filter(s => s.ro_status === "Fully Online").length;
    const partial = fleet.filter(s => s.ro_status === "Partially Online").length;
    const off     = fleet.filter(s => s.ro_status === "Offline").length;
    return [
      { name: "Fully Online",     value: fully,   fill: GREEN  },
      { name: "Partially Online", value: partial, fill: YELLOW },
      { name: "Offline",          value: off,     fill: RED    },
    ].filter(d => d.value > 0);
  }, [fleet]);

  // Vendor distribution (MPD count per vendor)
  const vendorData = useMemo(() => {
    const map = {};
    fleet.forEach(s => {
      const v = s.vendor_name || "Unknown";
      if (!map[v]) map[v] = { name: v, onboarded: 0, online: 0 };
      map[v].onboarded += s.onboarded_mpds || 0;
      map[v].online    += s.online_mpds    || 0;
    });
    return Object.values(map).sort((a, b) => b.onboarded - a.onboarded);
  }, [fleet]);

  // Sales area performance
  const areaData = useMemo(() => {
    const map = {};
    fleet.forEach(s => {
      const a = s.sales_area || "Unknown";
      if (!map[a]) map[a] = { name: a, ros: 0, onboarded_mpd: 0, online_mpd: 0 };
      map[a].ros++;
      map[a].onboarded_mpd += s.onboarded_mpds || 0;
      map[a].online_mpd    += s.online_mpds    || 0;
    });
    return Object.values(map).map(a => ({
      ...a,
      mpd_pct: a.onboarded_mpd > 0 ? Math.min(100, Math.round(a.online_mpd / a.onboarded_mpd * 100)) : 0,
    })).sort((a, b) => b.ros - a.ros);
  }, [fleet]);

  // Bottom ROs (offline hotspots)
  const bottomROs = useMemo(() =>
    [...fleet]
      .filter(s => s.onboarded_mpds > 0)
      .map(s => ({
        ...s,
        mpd_pct: Math.min(100, Math.round(((s.online_mpds || 0) / s.onboarded_mpds) * 100)),
        mpd_offline: Math.max(0, (s.onboarded_mpds || 0) - (s.online_mpds || 0)),
      }))
      .filter(s => s.mpd_offline > 0)
      .sort((a, b) => b.mpd_offline - a.mpd_offline)
      .slice(0, 15)
  , [fleet]);

  const pctColor = v => v >= 90 ? GREEN : v >= 70 ? YELLOW : RED;

  /* ── Fleet-level aggregates ────────────────────────────────────────── */
  const totalOnbMPD  = fleet.reduce((a, s) => a + (s.onboarded_mpds  || 0), 0);
  const totalOnlMPD  = fleet.reduce((a, s) => a + (s.online_mpds     || 0), 0);
  const totalOnbTank = fleet.reduce((a, s) => a + (s.onboarded_tanks || 0), 0);
  const totalOnlTank = fleet.reduce((a, s) => a + (s.online_tanks    || 0), 0);
  const offMPD       = Math.max(0, totalOnbMPD  - totalOnlMPD);
  const offTank      = Math.max(0, totalOnbTank - totalOnlTank);
  const mpdPct       = totalOnbMPD  > 0 ? Math.min(100, Math.round(totalOnlMPD  / totalOnbMPD  * 100)) : 0;
  const tankPct      = totalOnbTank > 0 ? Math.min(100, Math.round(totalOnlTank / totalOnbTank * 100)) : 0;

  const fullyOnlineROs   = fleet.filter(s => s.ro_status === "Fully Online").length;
  const partialROs       = fleet.filter(s => s.ro_status === "Partially Online").length;
  const offlineROs       = fleet.filter(s => s.ro_status === "Offline").length;
  const iotROs           = fleet.filter(s => s.iot_enabled === true).length;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">⬡ Dashboard</span>
        <div className="topbar-right">
          {loading && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
          <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
          <button
            className="btn btn-sm"
            onClick={handleClear}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: RED }}
          >
            🗑 Clear All Data
          </button>
        </div>
      </div>

      <div className="page-inner">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : !hasData ? (
          /* ── Empty State ──────────────────────────────────────────────── */
          <div className="card" style={{ marginTop: 40 }}>
            <div className="card-body">
              <div className="empty-state" style={{ padding: "64px 24px" }}>
                <div style={{ fontSize: "4rem", marginBottom: 16 }}>📊</div>
                <h3 style={{ fontSize: "1.3rem" }}>No Data Yet</h3>
                <p style={{ marginTop: 8, color: "var(--text-muted)", maxWidth: 400, margin: "8px auto" }}>
                  Upload your BPCL Excel report (e.g. <em>RO DATA 22-06-26.xlsx</em>) to populate the dashboard with real fleet data.
                </p>
                <a
                  href="/upload"
                  style={{
                    display: "inline-block", marginTop: 24, padding: "12px 28px",
                    background: `linear-gradient(135deg, ${CYAN}22, ${PURPLE}22)`,
                    border: `1px solid ${CYAN}44`, borderRadius: 8,
                    color: CYAN, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none",
                  }}
                >
                  📤 Upload Data
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Row 1: RO-level KPIs ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
              <KPICard label="Total ROs"       value={fleet.length}    icon="🏭" accent={CYAN}   />
              <KPICard label="Fully Online ROs"  value={fullyOnlineROs} icon="✅" accent={GREEN}  sub={`${fleet.length > 0 ? Math.round(fullyOnlineROs/fleet.length*100) : 0}% of fleet`} />
              <KPICard label="Partially Online" value={partialROs}     icon="⚡" accent={YELLOW} />
              <KPICard label="Offline ROs"       value={offlineROs}     icon="🔴" accent={RED}    />
              <KPICard label="IoT Enabled ROs"   value={iotROs}         icon="📡" accent={PURPLE} sub={`${fleet.length > 0 ? Math.round(iotROs/fleet.length*100) : 0}% of fleet`} />
            </div>

            {/* ── Row 2: MPD + Tank fleet cards ───────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <FleetCard
                label="MPD Network"
                onboarded={totalOnbMPD}
                online={totalOnlMPD}
                color={CYAN}
                icon="⛽"
              />
              <FleetCard
                label="Tank Network (ATG)"
                onboarded={totalOnbTank}
                online={totalOnlTank}
                color={PURPLE}
                icon="🛢️"
              />
            </div>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <div className="tabs">
              {[
                ["overview", "📊 Overview"],
                ["area",     "🗺 By Sales Area"],
                ["vendor",   "🏢 By Vendor"],
                ["hotspots", "🔴 Offline Hotspots"],
                ["fleet",    `🏪 Network Table (${fleet.length})`],
              ].map(([key, label]) => (
                <button key={key} className={`tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="grid-2">
                {/* RO Status Pie */}
                <div className="card">
                  <div className="card-body">
                    <div className="chart-title">🏭 RO Status Distribution</div>
                    <div className="chart-sub">Fully Online / Partially Online / Offline</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={roStatusPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%" cy="50%"
                          innerRadius={55}
                          outerRadius={78}
                          label={({ name, value, percent, x, y, textAnchor }) => (
                            <text x={x} y={y} textAnchor={textAnchor} fill="#E2E8F0" fontSize="10.5" fontWeight="600">
                              {`${name.split(" ")[0]}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            </text>
                          )}
                          labelLine={true}
                        >
                          {roStatusPie.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* legend */}
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
                      {roStatusPie.map(d => (
                        <span key={d.name} style={{ fontSize: "0.72rem", color: d.fill, fontWeight: 700 }}>
                          ● {d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RO Status breakdown bar */}
                <ROStatusCard fleet={fleet} />

                {/* MPD Donut */}
                <div className="card">
                  <div className="card-body">
                    <div className="chart-title">⛽ MPD Network — Online vs Offline</div>
                    <div className="chart-sub">{totalOnbMPD} total MPDs on-boarded across all ROs</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Online",  value: totalOnlMPD, fill: GREEN },
                            { name: "Offline", value: offMPD,      fill: RED   },
                          ]}
                          dataKey="value" nameKey="name"
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill={GREEN} />
                          <Cell fill={RED}   />
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                      <span style={{ fontSize: "0.72rem", color: GREEN, fontWeight: 700 }}>● Online: {totalOnlMPD} ({mpdPct}%)</span>
                      <span style={{ fontSize: "0.72rem", color: RED,   fontWeight: 700 }}>● Offline: {offMPD} ({100-mpdPct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Tank Donut */}
                <div className="card">
                  <div className="card-body">
                    <div className="chart-title">🛢️ Tank (ATG) Network — Online vs Offline</div>
                    <div className="chart-sub">{totalOnbTank} total tanks on-boarded across all ROs</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Online",  value: totalOnlTank, fill: PURPLE },
                            { name: "Offline", value: offTank,      fill: RED    },
                          ]}
                          dataKey="value" nameKey="name"
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill={PURPLE} />
                          <Cell fill={RED}    />
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                      <span style={{ fontSize: "0.72rem", color: PURPLE, fontWeight: 700 }}>● Online: {totalOnlTank} ({tankPct}%)</span>
                      <span style={{ fontSize: "0.72rem", color: RED,    fontWeight: 700 }}>● Offline: {offTank} ({100-tankPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BY SALES AREA TAB ────────────────────────────────────── */}
            {tab === "area" && (
              <div className="grid-2">
                <div className="card col-span-2">
                  <div className="card-body">
                    <div className="chart-title">🗺 Sales Area — RO Count & MPD Online %</div>
                    <div className="chart-sub">RO count and MPD connectivity per sales area</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={areaData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} angle={-20} textAnchor="end" />
                        <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#64748B" }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v, name) => [name === "mpd_pct" ? `${v}%` : v, name === "mpd_pct" ? "MPD Online%" : "RO Count"]} />
                        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                        <Bar yAxisId="left"  dataKey="ros"     name="RO Count"   fill={CYAN}   fillOpacity={0.7} radius={[4,4,0,0]} />
                        <Bar yAxisId="right" dataKey="mpd_pct" name="MPD Online %" radius={[4,4,0,0]}>
                          {areaData.map((d, i) => <Cell key={i} fill={pctColor(d.mpd_pct)} fillOpacity={0.8} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* area table */}
                <div className="card col-span-2">
                  <div className="card-body">
                    <div className="chart-title" style={{ marginBottom: 14 }}>Sales Area Summary</div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Sales Area</th>
                            <th style={{ textAlign: "center" }}>Total ROs</th>
                            <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                            <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                            <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                            <th style={{ textAlign: "center" }}>MPD Online%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {areaData.map(a => {
                            const off = a.onboarded_mpd - a.online_mpd;
                            const c   = pctColor(a.mpd_pct);
                            const bg  = a.mpd_pct >= 90 ? "rgba(16,185,129,0.15)" : a.mpd_pct >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                            return (
                              <tr key={a.name}>
                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.name}</td>
                                <td style={{ textAlign: "center" }}>{a.ros}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN   }}>{a.onboarded_mpd}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN  }}>{a.online_mpd}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: off > 0 ? RED : "#64748B" }}>{off}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color: c }}>{a.mpd_pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BY VENDOR TAB ────────────────────────────────────────── */}
            {tab === "vendor" && (
              <div className="grid-2">
                <div className="card col-span-2">
                  <div className="card-body">
                    <div className="chart-title">🏢 Vendor — MPD On-Boarded vs Online</div>
                    <div className="chart-sub">RA Vendor performance comparison by MPD counts</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vendorData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                        <Bar dataKey="onboarded" name="MPD Boarded" fill={CYAN}   fillOpacity={0.6} radius={[4,4,0,0]} />
                        <Bar dataKey="online"    name="MPD Online"  fill={GREEN}  fillOpacity={0.8} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card col-span-2">
                  <div className="card-body">
                    <div className="chart-title" style={{ marginBottom: 14 }}>Vendor Summary</div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>RA Vendor</th>
                            <th style={{ textAlign: "center" }}>ROs</th>
                            <th style={{ textAlign: "center", color: CYAN }}>MPD Boarded</th>
                            <th style={{ textAlign: "center", color: GREEN }}>MPD Online</th>
                            <th style={{ textAlign: "center", color: RED }}>MPD Offline</th>
                            <th style={{ textAlign: "center" }}>MPD Online%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorData.map(v => {
                            const off = v.onboarded - v.online;
                            const pct = v.onboarded > 0 ? Math.min(100, Math.round(v.online / v.onboarded * 100)) : 0;
                            const c   = pctColor(pct);
                            const bg  = pct >= 90 ? "rgba(16,185,129,0.15)" : pct >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                            return (
                              <tr key={v.name}>
                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.name}</td>
                                <td style={{ textAlign: "center" }}>{fleet.filter(s => s.vendor_name === v.name).length}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: CYAN  }}>{v.onboarded}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: GREEN }}>{v.online}</td>
                                <td style={{ textAlign: "center", fontWeight: 700, color: off > 0 ? RED : "#64748B" }}>{off}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color: c }}>{pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── OFFLINE HOTSPOTS TAB ─────────────────────────────────── */}
            {tab === "hotspots" && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div className="chart-title">🔴 Offline Hotspots — ROs with Most Offline MPDs</div>
                      <div className="chart-sub">Retail outlets with offline MPDs, sorted by highest offline count</div>
                    </div>
                    <span style={{
                      fontSize: "0.72rem", padding: "4px 12px", borderRadius: 4,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                      color: RED, fontWeight: 700,
                    }}>
                      {bottomROs.length} outlets affected
                    </span>
                  </div>
                  {bottomROs.length === 0 ? (
                    <div style={{ textAlign: "center", color: GREEN, padding: 40, fontSize: "0.9rem" }}>
                      ✅ All MPDs reporting online — no hotspots detected!
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={bottomROs.slice(0,15)} layout="vertical" margin={{ left: 160, right: 20, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                          <YAxis type="category" dataKey="ro_name" tick={{ fontSize: 10, fill: "#94A3B8" }} width={160} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v) => [v, "MPD Offline"]} />
                          <Bar dataKey="mpd_offline" name="MPD Offline" radius={[0,4,4,0]}>
                            {bottomROs.slice(0,15).map((r, i) => (
                              <Cell key={i} fill={pctColor(r.mpd_pct)} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="table-wrap" style={{ marginTop: 16 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>RO ID</th>
                              <th>Retail Outlet</th>
                              <th>Sales Area</th>
                              <th>Vendor</th>
                              <th style={{ color: CYAN }}>MPD Boarded</th>
                              <th style={{ color: GREEN }}>MPD Online</th>
                              <th style={{ color: RED }}>MPD Offline</th>
                              <th>MPD%</th>
                              <th>RO Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bottomROs.map((s, i) => {
                              const c  = pctColor(s.mpd_pct);
                              const bg = s.mpd_pct >= 90 ? "rgba(16,185,129,0.15)" : s.mpd_pct >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                              return (
                                <tr key={s.site_id}>
                                  <td style={{ color: "#475569", fontWeight: 700 }}>{i+1}</td>
                                  <td><span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: CYAN }}>{s.ro_id}</span></td>
                                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.ro_name}</td>
                                  <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{s.sales_area || "—"}</td>
                                  <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{s.vendor_name || "—"}</td>
                                  <td style={{ textAlign: "center", fontWeight: 700, color: CYAN   }}>{s.onboarded_mpds}</td>
                                  <td style={{ textAlign: "center", fontWeight: 700, color: GREEN  }}>{s.online_mpds}</td>
                                  <td style={{ textAlign: "center", fontWeight: 700, color: RED    }}>{s.mpd_offline}</td>
                                  <td style={{ textAlign: "center" }}>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color: c }}>{s.mpd_pct}%</span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: s.ro_status === "Offline" ? RED : YELLOW }}>
                                      {s.ro_status || "—"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── FLEET TABLE TAB ──────────────────────────────────────── */}
            {tab === "fleet" && <FleetTable sites={fleet} />}
          </>
        )}
      </div>
    </div>
  );
}
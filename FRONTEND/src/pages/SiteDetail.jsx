import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getSite, getSiteDevices, getSiteReadings, getSiteAlarms, acknowledgeAlarm } from "../services/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const TOOLTIP_STYLE = {
  background: "#0D1F3C", border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 8, fontSize: 12, color: "#F1F5F9",
};
const TOOLTIP_ITEM = { color: "#F1F5F9" };
const TOOLTIP_LABEL = { color: "#94A3B8" };

export default function SiteDetail() {
  const { id } = useParams();
  const [site, setSite]       = useState(null);
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [alarms, setAlarms]   = useState([]);
  const [tab, setTab]         = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getSite(id),
      getSiteDevices(id),
      getSiteReadings(id),
      getSiteAlarms(id),
    ]).then(([s, d, r, a]) => {
      if (s.status === "fulfilled") setSite(s.value.data);
      if (d.status === "fulfilled") setDevices(d.value.data);
      if (r.status === "fulfilled") setReadings(r.value.data);
      if (a.status === "fulfilled") setAlarms(a.value.data);
      setLoading(false);
    });
  }, [id]);

  const handleAck = async (alarmId) => {
    try {
      await acknowledgeAlarm(alarmId, "operator");
      setAlarms((prev) => prev.map((a) => a.id === alarmId ? { ...a, status: "acknowledged" } : a));
      toast.success("Alarm acknowledged");
    } catch { toast.error("Failed"); }
  };

  const chartData = readings.slice(-30).map((r) => ({
    time: r.timestamp ? format(new Date(r.timestamp), "HH:mm") : "",
    ro_online: r.ro_online_percent ?? null,
    mpd: r.mpd_uptime ?? null,
    tank: r.tank_uptime ?? null,
    pressure: r.feed_pressure ?? null,
    tds: r.permeate_tds ?? null,
  }));

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="topbar">
        <div className="flex items-center gap-3">
          <Link to="/sites" className="btn btn-outline btn-sm">← Back</Link>
          <span className="topbar-title">🏭 {site?.ro_name || `Site ${id}`}</span>
          {site?.status && <span className={`badge badge-${site.status}`}>{site.status}</span>}
        </div>
      </div>

      <div className="page-inner">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
          <div className="kpi-card" style={{ "--accent": "#00E5FF" }}>
            <div className="kpi-label">RO Online</div>
            <div className="kpi-value">{readings[readings.length-1]?.ro_online_percent ?? "—"}<span className="kpi-unit">%</span></div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#10B981" }}>
            <div className="kpi-label">MPD Uptime</div>
            <div className="kpi-value">{readings[readings.length-1]?.mpd_uptime ?? "—"}<span className="kpi-unit">%</span></div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#F59E0B" }}>
            <div className="kpi-label">Tank Uptime</div>
            <div className="kpi-value">{readings[readings.length-1]?.tank_uptime ?? "—"}<span className="kpi-unit">%</span></div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#7C4DFF" }}>
            <div className="kpi-label">Devices</div>
            <div className="kpi-value">{devices.length}</div>
          </div>
          <div className="kpi-card" style={{ "--accent": alarms.filter(a=>a.status==="active").length > 0 ? "#EF4444" : "#10B981" }}>
            <div className="kpi-label">Active Alarms</div>
            <div className="kpi-value">{alarms.filter(a=>a.status==="active").length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {["overview","devices","alarms","readings"].map((t) => (
            <button key={t} className={`tab${tab===t?" active":""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid-2">
            <div className="card col-span-2">
              <div className="card-body">
                <div className="chart-title">Performance Trend — Last 30 Readings</div>
                <div className="chart-sub">RO Online %, MPD Uptime, Tank Uptime</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_LABEL} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Line type="monotone" dataKey="ro_online" stroke="#00E5FF" strokeWidth={2} dot={false} name="RO Online %" />
                    <Line type="monotone" dataKey="mpd"      stroke="#10B981" strokeWidth={2} dot={false} name="MPD Uptime %" />
                    <Line type="monotone" dataKey="tank"     stroke="#F59E0B" strokeWidth={2} dot={false} name="Tank Uptime %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="chart-title">Site Information</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {[
                    { label: "Site ID",   value: site?.ro_id },
                    { label: "Name",      value: site?.ro_name },
                    { label: "City",      value: site?.city },
                    { label: "Country",   value: site?.country },
                    { label: "Capacity",  value: site?.capacity_m3_day ? `${site.capacity_m3_day} m³/day` : null },
                    { label: "Status",    value: site?.status },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{label}</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Devices */}
        {tab === "devices" && (
          <div className="card">
            <div className="card-body">
              {devices.length === 0 ? <div className="empty-state"><h3>No devices</h3></div> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Device</th><th>Type</th><th>Status</th><th>Feed Pressure</th><th>TDS</th><th>Recovery</th></tr></thead>
                    <tbody>
                      {devices.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.device_name}</td>
                          <td><span style={{ textTransform: "capitalize" }}>{d.device_type}</span></td>
                          <td><span className={`badge badge-${d.status || "online"}`}><span className="pulse-dot" />{d.status || "online"}</span></td>
                          <td>{d.feed_pressure ? `${d.feed_pressure} bar` : "—"}</td>
                          <td>{d.tds_level ? `${d.tds_level} ppm` : "—"}</td>
                          <td>{d.recovery_rate ? `${d.recovery_rate}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alarms */}
        {tab === "alarms" && (
          <div className="card">
            <div className="card-body">
              {alarms.length === 0 ? <div className="empty-state"><h3>✓ No alarms</h3><p>All systems normal</p></div> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Severity</th><th>Message</th><th>Parameter</th><th>Value</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
                    <tbody>
                      {alarms.map((a) => (
                        <tr key={a.id} className={a.severity === "critical" ? "alarm-critical-row" : ""}>
                          <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                          <td style={{ color: "var(--text-primary)" }}>{a.message}</td>
                          <td>{a.parameter || "—"}</td>
                          <td>{a.value ?? "—"}</td>
                          <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>{a.created_at ? format(new Date(a.created_at), "MMM d HH:mm") : "—"}</td>
                          <td>
                            {a.status === "active" && (
                              <button className="btn btn-outline btn-sm" onClick={() => handleAck(a.id)}>Ack</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Readings */}
        {tab === "readings" && (
          <div className="card">
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Timestamp</th><th>RO Online %</th><th>MPD Uptime</th><th>Tank Uptime</th><th>Feed Pressure</th><th>TDS</th><th>Flow</th></tr></thead>
                  <tbody>
                    {readings.slice(-50).reverse().map((r) => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>{r.timestamp ? format(new Date(r.timestamp), "MMM d HH:mm:ss") : "—"}</td>
                        <td>{r.ro_online_percent ?? "—"}</td>
                        <td>{r.mpd_uptime ?? "—"}</td>
                        <td>{r.tank_uptime ?? "—"}</td>
                        <td>{r.feed_pressure ? `${r.feed_pressure} bar` : "—"}</td>
                        <td>{r.permeate_tds ? `${r.permeate_tds} ppm` : "—"}</td>
                        <td>{r.flow_rate ? `${r.flow_rate} L/h` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

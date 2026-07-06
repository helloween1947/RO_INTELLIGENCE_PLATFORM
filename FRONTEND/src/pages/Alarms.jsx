import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { getAlarms, getAlarmStats, acknowledgeAlarm, resolveAlarm } from "../services/api";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const SEV_COLORS = { critical: "#EF4444", high: "#F59E0B", medium: "#3B82F6", low: "#10B981" };

const TOOLTIP_STYLE = {
  background: "#0D1F3C", border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 8, fontSize: 12, color: "#F1F5F9",
};
const TOOLTIP_ITEM = { color: "#F1F5F9" };
const TOOLTIP_LABEL = { color: "#94A3B8" };

export default function Alarms() {
  const [alarms, setAlarms]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("live");
  const [severity, setSeverity] = useState("all");
  const [statusF, setStatusF]   = useState("active");

  const load = useCallback(async () => {
    try {
      const params = {};
      if (severity !== "all") params.severity = severity;
      if (statusF !== "all")  params.status = statusF;
      const [a, s] = await Promise.allSettled([getAlarms(params), getAlarmStats()]);
      if (a.status === "fulfilled") setAlarms(a.value.data);
      if (s.status === "fulfilled") setStats(s.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [severity, statusF]);

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  const handleAck = async (id) => {
    try {
      await acknowledgeAlarm(id, "operator");
      toast.success("Alarm acknowledged");
      load();
    } catch { toast.error("Failed"); }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlarm(id);
      toast.success("Alarm resolved");
      load();
    } catch { toast.error("Failed"); }
  };

  const statsData = stats ? [
    { name: "Critical", value: stats.critical || 0, color: "#EF4444" },
    { name: "High",     value: stats.high     || 0, color: "#F59E0B" },
    { name: "Medium",   value: stats.medium   || 0, color: "#3B82F6" },
    { name: "Low",      value: stats.low      || 0, color: "#10B981" },
  ] : [];

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🔔 Alarm Management</span>
        <div className="topbar-right">
          <div className="flex items-center gap-2">
            {stats && (
              <>
                <span style={{ fontSize: "0.72rem", color: "#EF4444", fontWeight: 700 }}>
                  ● {stats.critical} CRITICAL
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {stats.total_active} active total
                </span>
              </>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-inner">
        {/* Stats row */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 24 }}>
          {[
            { label: "Total Active", value: stats?.total_active ?? 0, accent: "#00E5FF" },
            { label: "Critical",     value: stats?.critical     ?? 0, accent: "#EF4444" },
            { label: "High",         value: stats?.high         ?? 0, accent: "#F59E0B" },
            { label: "Medium",       value: stats?.medium       ?? 0, accent: "#3B82F6" },
            { label: "Low",          value: stats?.low          ?? 0, accent: "#10B981" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="kpi-card" style={{ "--accent": accent }}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {["live","history","analytics"].map((t) => (
            <button key={t} className={`tab${tab===t?" active":""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Live Feed */}
        {tab === "live" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <select className="input" value={severity} onChange={(e) => { setSeverity(e.target.value); }}>
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select className="input" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="card">
              <div className="card-body">
                {loading ? <div className="loading-center"><div className="spinner" /></div>
                : alarms.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
                    <h3>No Active Alarms</h3>
                    <p>All systems operating normally</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {alarms.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          background: a.severity === "critical" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: 8,
                          animation: a.severity === "critical" ? "alarm-glow 2s infinite" : "none",
                        }}
                      >
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: SEV_COLORS[a.severity] || "#94A3B8",
                          boxShadow: `0 0 8px ${SEV_COLORS[a.severity]}`,
                          flexShrink: 0,
                          animation: a.status === "active" ? "pulse 1.5s infinite" : "none",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{a.message}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {a.parameter && <span>{a.parameter}: <strong style={{ color: SEV_COLORS[a.severity] }}>{a.value}</strong> | </span>}
                            {a.created_at && formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                          {a.status === "active" && (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => handleAck(a.id)}>Ack</button>
                              <button className="btn btn-sm" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }} onClick={() => handleResolve(a.id)}>Resolve</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="card">
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Severity</th><th>Message</th><th>Parameter</th><th>Value / Threshold</th><th>Status</th><th>Created</th><th>Resolved</th></tr>
                  </thead>
                  <tbody>
                    {alarms.map((a) => (
                      <tr key={a.id}>
                        <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                        <td style={{ color: "var(--text-primary)", maxWidth: 300 }}>{a.message}</td>
                        <td>{a.parameter || "—"}</td>
                        <td>{a.value != null ? `${a.value} / ${a.threshold ?? "—"}` : "—"}</td>
                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                        <td style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>{a.created_at ? format(new Date(a.created_at), "MMM d HH:mm") : "—"}</td>
                        <td style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>{a.resolved_at ? format(new Date(a.resolved_at), "MMM d HH:mm") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {tab === "analytics" && (
          <div className="card">
            <div className="card-body">
              <div className="chart-title">Alarm Distribution by Severity</div>
              <div className="chart-sub">Current platform-wide breakdown</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statsData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_LABEL} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                    {statsData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

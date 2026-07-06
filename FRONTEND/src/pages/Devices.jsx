import { useEffect, useState } from "react";
import { getDevices, postDeviceHeartbeat } from "../services/api";
import toast from "react-hot-toast";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    getDevices()
      .then((r) => setDevices(r.data))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, []);

  const handleHeartbeat = async (deviceId) => {
    try {
      await postDeviceHeartbeat(deviceId);
      setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, status: "online" } : d));
      toast.success("Heartbeat sent — device marked online");
    } catch { toast.error("Failed"); }
  };

  const filtered = devices.filter((d) => {
    const matchSearch = d.device_name?.toLowerCase().includes(search.toLowerCase()) || d.device_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: devices.length,
    online: devices.filter((d) => d.status === "online" || !d.status).length,
    offline: devices.filter((d) => d.status === "offline").length,
    maintenance: devices.filter((d) => d.status === "maintenance").length,
  };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">⚙️ Devices</span>
        <div className="topbar-right">
          <input className="input" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="page-inner">
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
          <div className="kpi-card" style={{ "--accent": "#00E5FF" }}><div className="kpi-label">Total Devices</div><div className="kpi-value">{counts.total}</div><div className="kpi-icon">⚙️</div></div>
          <div className="kpi-card" style={{ "--accent": "#10B981" }}><div className="kpi-label">Online</div><div className="kpi-value">{counts.online}</div><div className="kpi-icon">✓</div></div>
          <div className="kpi-card" style={{ "--accent": "#EF4444" }}><div className="kpi-label">Offline</div><div className="kpi-value">{counts.offline}</div><div className="kpi-icon">✗</div></div>
          <div className="kpi-card" style={{ "--accent": "#F59E0B" }}><div className="kpi-label">Maintenance</div><div className="kpi-value">{counts.maintenance}</div><div className="kpi-icon">🔧</div></div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><h3>No devices found</h3><p>Load demo data from the dashboard or adjust filters.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Device Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Feed Pressure</th>
                      <th>Permeate Flow</th>
                      <th>TDS</th>
                      <th>Recovery</th>
                      <th>Last Heartbeat</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.device_name}</td>
                        <td style={{ textTransform: "capitalize" }}>{d.device_type || "—"}</td>
                        <td><span className={`badge badge-${d.status || "online"}`}><span className="pulse-dot" />{d.status || "online"}</span></td>
                        <td>{d.feed_pressure != null ? `${Number(d.feed_pressure).toFixed(1)} bar` : "—"}</td>
                        <td>{d.permeate_flow != null ? `${Number(d.permeate_flow).toFixed(0)} L/h` : "—"}</td>
                        <td>{d.tds_level != null ? `${Number(d.tds_level).toFixed(0)} ppm` : "—"}</td>
                        <td>{d.recovery_rate != null ? `${Number(d.recovery_rate).toFixed(1)}%` : "—"}</td>
                        <td style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : "Never"}
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => handleHeartbeat(d.id)}>♥ Ping</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

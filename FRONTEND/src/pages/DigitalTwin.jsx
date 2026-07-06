import { useState, useEffect, useRef } from "react";
import { getDevices, postSensorReading } from "../services/api";
import toast from "react-hot-toast";

/* ─── SVG Plant Schematic ───────────────────────────────────── */
function PlantSchematic({ metrics }) {
  const {
    feed_pressure = 0,
    permeate_flow = 0,
    tds_level = 0,
    recovery_rate = 0,
    energy_kwh = 0,
    uptime_pct = 100,
    status = "online",
  } = metrics || {};

  const isOnline = status === "online";
  const pumpColor = isOnline ? "#10B981" : "#64748B";
  const memColor = feed_pressure > 80 ? "#EF4444" : feed_pressure > 60 ? "#F59E0B" : "#10B981";
  const tdsColor = tds_level > 400 ? "#EF4444" : tds_level > 300 ? "#F59E0B" : "#00E5FF";
  const feedLevel = Math.min(100, Math.max(10, 60 + Math.random() * 20));
  const permLevel = Math.min(100, Math.max(10, recovery_rate || 65));

  return (
    <svg viewBox="0 0 900 420" style={{ width: "100%", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Background */}
      <rect width="900" height="420" fill="#060E1A" rx="12" />
      <text x="450" y="24" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600" letterSpacing="3">
        RO PLANT SCHEMATIC — LIVE VIEW
      </text>

      {/* ── FEED TANK ── */}
      <g transform="translate(40,60)">
        <rect width="100" height="240" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <rect x="2" y={2 + 240 * (1 - feedLevel / 100)} width="96" height={240 * feedLevel / 100 - 2} rx="3" fill="rgba(59,130,246,0.25)" />
        <rect x="2" y={2 + 240 * (1 - feedLevel / 100)} width="96" height="4" fill="#3B82F6" rx="1" />
        <text x="50" y="-10" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">FEED TANK</text>
        <text x="50" y="130" textAnchor="middle" fill="#3B82F6" fontSize="20" fontWeight="800">{Math.round(feedLevel)}%</text>
        <text x="50" y="148" textAnchor="middle" fill="#64748B" fontSize="10">Water Level</text>
        <text x="50" y="270" textAnchor="middle" fill="#64748B" fontSize="10">Seawater Feed</text>
      </g>

      {/* Pipe: Feed Tank → Pre-filter */}
      <line x1="140" y1="180" x2="200" y2="180" stroke="#3B82F6" strokeWidth="3" strokeDasharray={isOnline ? "0" : "6 4"} />
      <polygon points="195,174 205,180 195,186" fill="#3B82F6" />

      {/* ── PRE-FILTER ── */}
      <g transform="translate(200,130)">
        <rect width="80" height="100" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
        {[10,20,30,40,50,60,70,80,90].map((y) => (
          <line key={y} x1="10" y1={y} x2="70" y2={y} stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
        ))}
        <text x="40" y="-10" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">PRE-FILTER</text>
        <text x="40" y="115" textAnchor="middle" fill="#64748B" fontSize="10">5 μm</text>
      </g>

      {/* Pipe: Pre-filter → HP Pump */}
      <line x1="280" y1="180" x2="340" y2="180" stroke="#3B82F6" strokeWidth="3" />
      <polygon points="335,174 345,180 335,186" fill="#3B82F6" />

      {/* ── HP PUMP ── */}
      <g transform="translate(340,140)">
        <circle cx="45" cy="45" r="45" fill="rgba(0,229,255,0.08)" stroke={pumpColor} strokeWidth="2" />
        <circle cx="45" cy="45" r="30" fill="rgba(0,229,255,0.05)" stroke={pumpColor} strokeWidth="1" strokeDasharray="4 2" />
        <text x="45" y="-14" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">HP PUMP</text>
        <text x="45" y="43" textAnchor="middle" fill={pumpColor} fontSize="11" fontWeight="800">
          {Number(feed_pressure || 0).toFixed(0)} bar
        </text>
        <text x="45" y="57" textAnchor="middle" fill="#64748B" fontSize="10">Pressure</text>
        <text x="45" y="104" textAnchor="middle" fill={pumpColor} fontSize="10">{isOnline ? "● RUNNING" : "○ STOPPED"}</text>
        {/* Spinning indicator */}
        {isOnline && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 45 45"
            to="360 45 45"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </g>

      {/* Pipe: HP Pump → RO Membrane */}
      <line x1="430" y1="185" x2="490" y2="185" stroke="#00E5FF" strokeWidth="4" />
      <polygon points="485,179 495,185 485,191" fill="#00E5FF" />
      <text x="460" y="175" textAnchor="middle" fill="#00E5FF" fontSize="9" fontWeight="600">HIGH P</text>

      {/* ── RO MEMBRANE VESSEL ── */}
      <g transform="translate(490,130)">
        <rect width="200" height="110" rx="8" fill="rgba(0,229,255,0.04)" stroke={memColor} strokeWidth="2" />
        {/* Membrane tubes */}
        {[20,45,70,95].map((y) => (
          <rect key={y} x="10" y={y} width="180" height="14" rx="2" fill={`rgba(0,229,255,0.08)`} stroke={`rgba(0,229,255,0.15)`} strokeWidth="1" />
        ))}
        {/* Flow animation */}
        {isOnline && [20,45,70,95].map((y) => (
          <rect key={`flow-${y}`} x="10" y={y+2} width="20" height="10" rx="1" fill="rgba(0,229,255,0.4)">
            <animateTransform attributeName="transform" type="translate" from="0,0" to="160,0" dur={`${1.5 + y/100}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <text x="100" y="-12" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">RO MEMBRANE VESSEL</text>
        <text x="100" y="125" textAnchor="middle" fill={memColor} fontSize="10" fontWeight="600">
          Rejection: {tds_level > 0 ? `${(100 - tds_level / 50).toFixed(1)}%` : "99.2%"} | Status: {memColor === "#10B981" ? "Good" : memColor === "#F59E0B" ? "Warning" : "Critical"}
        </text>
      </g>

      {/* Pipe: Membrane → Permeate Tank (top right) */}
      <line x1="690" y1="165" x2="760" y2="165" stroke={tdsColor} strokeWidth="3" />
      <polygon points="755,159 765,165 755,171" fill={tdsColor} />
      <text x="720" y="155" textAnchor="middle" fill={tdsColor} fontSize="9" fontWeight="600">PERMEATE</text>

      {/* Concentrate line (bottom) */}
      <line x1="690" y1="210" x2="760" y2="260" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" />
      <text x="730" y="250" textAnchor="middle" fill="#64748B" fontSize="9">BRINE</text>

      {/* ── PERMEATE TANK ── */}
      <g transform="translate(760,60)">
        <rect width="100" height="200" rx="4" fill="rgba(255,255,255,0.04)" stroke={`${tdsColor}60`} strokeWidth="1.5" />
        <rect x="2" y={2 + 200 * (1 - permLevel / 100)} width="96" height={200 * permLevel / 100 - 2} rx="3" fill={`${tdsColor}30`} />
        <rect x="2" y={2 + 200 * (1 - permLevel / 100)} width="96" height="4" fill={tdsColor} rx="1" />
        <text x="50" y="-10" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">PRODUCT TANK</text>
        <text x="50" y="108" textAnchor="middle" fill={tdsColor} fontSize="18" fontWeight="800">{Math.round(permLevel)}%</text>
        <text x="50" y="126" textAnchor="middle" fill="#64748B" fontSize="10">Tank Level</text>
        <text x="50" y="220" textAnchor="middle" fill={tdsColor} fontSize="10">TDS: {Number(tds_level || 0).toFixed(0)} ppm</text>
      </g>

      {/* Legend */}
      <g transform="translate(40,370)">
        {[
          { color: "#10B981", label: "Normal" },
          { color: "#F59E0B", label: "Warning" },
          { color: "#EF4444", label: "Critical" },
          { color: "#3B82F6", label: "Feed Water" },
          { color: "#00E5FF", label: "Permeate" },
          { color: "#94A3B8", label: "Concentrate" },
        ].map(({ color, label }, i) => (
          <g key={label} transform={`translate(${i * 140},0)`}>
            <rect width="12" height="12" rx="2" fill={color} />
            <text x="16" y="10" fill="#64748B" fontSize="10">{label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────── */
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ height: 32 }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${30 - ((v - min) / range) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 80 32" style={{ width: 80, height: 32 }}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function DigitalTwin() {
  const [devices, setDevices]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [metrics, setMetrics]     = useState({});
  const [history, setHistory]     = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    getDevices()
      .then((r) => {
        setDevices(r.data);
        if (r.data.length > 0) setSelected(r.data[0]);
      })
      .catch(() => {
        // Use mock devices if backend not ready
        const mock = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          device_name: `RO Unit ${i + 1}`,
          device_type: "ro_unit",
          status: i === 2 ? "maintenance" : "online",
        }));
        setDevices(mock);
        setSelected(mock[0]);
      });
  }, []);

  // Simulate live metrics for selected device
  useEffect(() => {
    if (!selected) return;
    const simulate = () => {
      const m = {
        feed_pressure:  parseFloat((Math.random() * 30 + 50).toFixed(1)),
        permeate_flow:  parseFloat((Math.random() * 200 + 600).toFixed(0)),
        tds_level:      parseFloat((Math.random() * 150 + 100).toFixed(0)),
        recovery_rate:  parseFloat((Math.random() * 10 + 65).toFixed(1)),
        energy_kwh:     parseFloat((Math.random() * 1 + 2.5).toFixed(2)),
        uptime_pct:     parseFloat((Math.random() * 5 + 95).toFixed(1)),
        status:         selected.status || "online",
      };
      setMetrics(m);
      setHistory((prev) => {
        const keys = ["feed_pressure", "permeate_flow", "tds_level", "recovery_rate"];
        const next = { ...prev };
        keys.forEach((k) => {
          next[k] = [...(prev[k] || []), m[k]].slice(-20);
        });
        return next;
      });
    };
    simulate();
    intervalRef.current = setInterval(simulate, 3000);
    return () => clearInterval(intervalRef.current);
  }, [selected]);

  const METRIC_CARDS = [
    { key: "feed_pressure",  label: "Feed Pressure",   unit: "bar", color: "#00E5FF", warn: 80, crit: 85 },
    { key: "permeate_flow",  label: "Permeate Flow",   unit: "L/h", color: "#10B981", warn: 400, crit: 200 },
    { key: "tds_level",      label: "TDS Level",       unit: "ppm", color: "#F59E0B", warn: 400, crit: 500 },
    { key: "recovery_rate",  label: "Recovery Rate",   unit: "%",   color: "#7C4DFF", warn: 55,  crit: 50  },
    { key: "energy_kwh",     label: "Energy",          unit: "kWh", color: "#3B82F6" },
    { key: "uptime_pct",     label: "Uptime",          unit: "%",   color: "#10B981" },
  ];

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🌐 Digital Twin — Live Plant View</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          ● Simulating live data every 3s
        </span>
      </div>

      <div className="page-inner" style={{ padding: "20px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, height: "calc(100vh - 120px)" }}>
          {/* Left panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
            {/* Device list */}
            <div className="card">
              <div className="card-body">
                <div className="chart-title" style={{ marginBottom: 12 }}>RO Units</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {devices.filter((d) => d.device_type === "ro_unit" || !d.device_type || devices.length < 6).slice(0, 8).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelected(d)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        background: selected?.id === d.id ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${selected?.id === d.id ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        color: selected?.id === d.id ? "var(--cyan)" : "var(--text-secondary)",
                        fontSize: "0.8rem",
                        fontWeight: selected?.id === d.id ? 700 : 500,
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: d.status === "offline" ? "#EF4444" : d.status === "maintenance" ? "#F59E0B" : "#10B981",
                        flexShrink: 0,
                      }} />
                      {d.device_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live metrics */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-body">
                <div className="chart-title" style={{ marginBottom: 12 }}>Live Metrics</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {METRIC_CARDS.map(({ key, label, unit, color }) => (
                    <div key={key} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                        <Sparkline data={history[key]} color={color} />
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color }}>
                        {metrics[key] ?? "—"}
                        <span style={{ fontSize: "0.72rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: 3 }}>{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SVG Schematic */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ height: "100%", padding: 0 }}>
              <PlantSchematic metrics={metrics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

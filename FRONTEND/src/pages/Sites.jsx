import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getSites, getFleetStatus } from "../services/api";

export default function Sites() {
  const [sites,  setSites]  = useState([]);
  const [fleet,  setFleet]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedArea, setSelectedArea] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [mpdOfflineOnly, setMpdOfflineOnly] = useState(false);
  const [mpdBand, setMpdBand] = useState("");
  const [tankOfflineOnly, setTankOfflineOnly] = useState(false);
  const [tankBand, setTankBand] = useState("");

  useEffect(() => {
    Promise.allSettled([getSites(), getFleetStatus()])
      .then(([s, f]) => {
        if (s.status === "fulfilled") setSites(s.value.data);
        if (f.status === "fulfilled") setFleet(f.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Merge fleet data (has MPD/Tank readings) into basic site list by ro_id
  const fleetMap = useMemo(() => {
    return Object.fromEntries(fleet.map(f => [f.ro_id, f]));
  }, [fleet]);

  const enrichedSites = useMemo(() => {
    return sites.map(s => {
      const fd = fleetMap[s.ro_id] || {};
      return {
        ...s,
        sales_area: fd.sales_area,
        vendor_name: fd.vendor_name,
        onboarded_mpds: fd.onboarded_mpds,
        online_mpds: fd.online_mpds,
        onboarded_tanks: fd.onboarded_tanks,
        online_tanks: fd.online_tanks,
      };
    });
  }, [sites, fleetMap]);

  const uniqueAreas = useMemo(() => {
    const set = new Set(enrichedSites.map(s => s.sales_area).filter(Boolean));
    return Array.from(set).sort();
  }, [enrichedSites]);

  const uniqueVendors = useMemo(() => {
    const set = new Set(enrichedSites.map(s => s.vendor_name).filter(Boolean));
    return Array.from(set).sort();
  }, [enrichedSites]);

  const filtered = useMemo(() => {
    return enrichedSites.filter(s => {
      // Text Search
      if (search) {
        const query = search.toLowerCase();
        const matchesText =
          s.ro_name?.toLowerCase().includes(query) ||
          s.ro_id?.toLowerCase().includes(query) ||
          s.city?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // Sales Area Filter
      if (selectedArea && s.sales_area !== selectedArea) return false;

      // Vendor Filter
      if (selectedVendor && s.vendor_name !== selectedVendor) return false;

      // MPD offline
      const offMpd = (s.onboarded_mpds != null && s.online_mpds != null) ? Math.max(0, s.onboarded_mpds - s.online_mpds) : 0;
      if (mpdOfflineOnly && offMpd === 0) return false;

      // MPD Band
      const mpdPct = s.onboarded_mpds > 0 ? Math.round((s.online_mpds / s.onboarded_mpds) * 100) : null;
      if (mpdBand) {
        if (mpdPct === null) return false;
        if (mpdBand === "good" && mpdPct < 90) return false;
        if (mpdBand === "warn" && mpdPct >= 90) return false;
        if (mpdBand === "crit" && mpdPct >= 70) return false;
      }

      // Tank offline
      const offTank = (s.onboarded_tanks != null && s.online_tanks != null) ? Math.max(0, s.onboarded_tanks - s.online_tanks) : 0;
      if (tankOfflineOnly && offTank === 0) return false;

      // Tank Band
      const tankPct = s.onboarded_tanks > 0 ? Math.round((s.online_tanks / s.onboarded_tanks) * 100) : null;
      if (tankBand) {
        if (tankPct === null) return false;
        if (tankBand === "good" && tankPct < 90) return false;
        if (tankBand === "warn" && tankPct >= 90) return false;
        if (tankBand === "crit" && tankPct >= 70) return false;
      }

      return true;
    });
  }, [enrichedSites, search, selectedArea, selectedVendor, mpdOfflineOnly, mpdBand, tankOfflineOnly, tankBand]);

  const totalSites  = sites.length;
  const activeSites = sites.filter(s => s.status === "active" || !s.status).length;

  const hasActiveFilters = search || selectedArea || selectedVendor || mpdOfflineOnly || mpdBand || tankOfflineOnly || tankBand;

  const clearAllFilters = () => {
    setSearch("");
    setSelectedArea("");
    setSelectedVendor("");
    setMpdOfflineOnly(false);
    setMpdBand("");
    setTankOfflineOnly(false);
    setTankBand("");
  };

  const selectStyle = {
    padding: "3px 6px",
    background: "#0B1628",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    color: "#CBD5E1",
    fontSize: "0.72rem",
    outline: "none",
    width: "100%",
    cursor: "pointer",
  };

  const pctBadge = (v) => {
    if (v == null) return <span style={{ color: "#475569" }}>—</span>;
    const c  = v >= 90 ? "#10B981" : v >= 70 ? "#F59E0B" : "#EF4444";
    const bg = v >= 90 ? "rgba(16,185,129,0.15)" : v >= 70 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
    return <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color: c }}>{v}%</span>;
  };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🏭 Sites</span>
        <div className="topbar-right" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn btn-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444", fontWeight: 700 }}
            >
              🧹 Clear Filters
            </button>
          )}
          <input
            className="input"
            placeholder="Search sites..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
      </div>

      <div className="page-inner">
        {/* ── KPI Cards ── */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginBottom: 24 }}>
          <div className="kpi-card" style={{ "--accent": "#00E5FF" }}>
            <div className="kpi-label">Total Sites</div>
            <div className="kpi-value">{totalSites}</div>
            <div className="kpi-icon">🏭</div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#10B981" }}>
            <div className="kpi-label">Active</div>
            <div className="kpi-value">{activeSites}</div>
            <div className="kpi-icon">✓</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : enrichedSites.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏭</div>
                <h3>No Sites Found</h3>
                <p style={{ marginTop: 8, maxWidth: 380, margin: "8px auto" }}>
                  Upload your BPCL Excel data to populate the site directory.
                </p>
                <a
                  href="/upload"
                  style={{
                    display: "inline-block", marginTop: 20, padding: "10px 22px",
                    background: "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(124,77,255,0.12))",
                    border: "1px solid rgba(0,229,255,0.3)", borderRadius: 8,
                    color: "#00E5FF", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none",
                  }}
                >
                  📤 Upload Data
                </a>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>RO ID</th>
                      <th>Retail Outlet</th>
                      <th>Sales Area</th>
                      <th>Vendor</th>
                      <th style={{ color: "#00E5FF" }}>MPD On-Boarded</th>
                      <th style={{ color: "#10B981" }}>MPD Online</th>
                      <th style={{ color: "#EF4444" }}>MPD Offline</th>
                      <th style={{ color: "#00E5FF" }}>MPD%</th>
                      <th style={{ color: "#7C4DFF" }}>Tank On-Boarded</th>
                      <th style={{ color: "#10B981" }}>Tank Online</th>
                      <th style={{ color: "#EF4444" }}>Tank Offline</th>
                      <th style={{ color: "#7C4DFF" }}>Tank%</th>
                      <th>Action</th>
                    </tr>
                    <tr>
                      <td></td>
                      <td></td>
                      <td>
                        <select
                          value={selectedArea}
                          onChange={e => setSelectedArea(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">All Areas</option>
                          {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          value={selectedVendor}
                          onChange={e => setSelectedVendor(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">All Vendors</option>
                          {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td></td>
                      <td></td>
                      <td>
                        <select
                          value={mpdOfflineOnly ? "yes" : ""}
                          onChange={e => setMpdOfflineOnly(e.target.value === "yes")}
                          style={selectStyle}
                        >
                          <option value="">All</option>
                          <option value="yes">&gt; 0</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={mpdBand}
                          onChange={e => setMpdBand(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">All</option>
                          <option value="good">≥90%</option>
                          <option value="warn">&lt;90%</option>
                          <option value="crit">&lt;70%</option>
                        </select>
                      </td>
                      <td></td>
                      <td></td>
                      <td>
                        <select
                          value={tankOfflineOnly ? "yes" : ""}
                          onChange={e => setTankOfflineOnly(e.target.value === "yes")}
                          style={selectStyle}
                        >
                          <option value="">All</option>
                          <option value="yes">&gt; 0</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={tankBand}
                          onChange={e => setTankBand(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">All</option>
                          <option value="good">≥90%</option>
                          <option value="warn">&lt;90%</option>
                          <option value="crit">&lt;70%</option>
                        </select>
                      </td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(site => {
                      const onbMpd  = site.onboarded_mpds;
                      const onMpd   = site.online_mpds;
                      const offMpd  = (onbMpd != null && onMpd != null) ? Math.max(0, onbMpd - onMpd) : null;
                      const mpdPct  = onbMpd > 0 ? Math.round((onMpd / onbMpd) * 100) : null;

                      const onbTank = site.onboarded_tanks;
                      const onTank  = site.online_tanks;
                      const offTank = (onbTank != null && onTank != null) ? Math.max(0, onbTank - onTank) : null;
                      const tankPct = onbTank > 0 ? Math.round((onTank / onbTank) * 100) : null;

                      return (
                        <tr key={site.id}>
                          <td><span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--cyan)" }}>{site.ro_id}</span></td>
                          <td><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{site.ro_name}</span></td>
                          <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{site.sales_area || "—"}</td>
                          <td style={{ color: "#94A3B8", fontSize: "0.78rem" }}>{site.vendor_name || "—"}</td>
                          {/* MPD */}
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#00E5FF" }}>{onbMpd ?? "—"}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#10B981" }}>{onMpd ?? "—"}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: offMpd > 0 ? "#EF4444" : "#64748B" }}>{offMpd ?? "—"}</td>
                          <td style={{ textAlign: "center" }}>{pctBadge(mpdPct)}</td>
                          {/* Tank */}
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#7C4DFF" }}>{onbTank ?? "—"}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#10B981" }}>{onTank ?? "—"}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: offTank > 0 ? "#EF4444" : "#64748B" }}>{offTank ?? "—"}</td>
                          <td style={{ textAlign: "center" }}>{pctBadge(tankPct)}</td>
                          <td>
                            <Link to={`/sites/${site.id}`} className="btn btn-outline btn-sm">
                              View →
                            </Link>
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
      </div>
    </div>
  );
}

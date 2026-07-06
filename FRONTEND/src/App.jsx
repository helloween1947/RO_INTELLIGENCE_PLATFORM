import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import "./index.css";

const Dashboard        = lazy(() => import("./pages/dashboard"));
const Sites            = lazy(() => import("./pages/Sites"));
const SiteDetail       = lazy(() => import("./pages/SiteDetail"));
const Analytics        = lazy(() => import("./pages/Analytics"));
const Upload           = lazy(() => import("./pages/Upload"));
const SalesPerformance = lazy(() => import("./pages/SalesPerformance"));
const VendorPerformance= lazy(() => import("./pages/VendorPerformance"));
const IoTComparison    = lazy(() => import("./pages/IoTComparison"));

const NAV_CORE = [
  { to: "/dashboard", icon: "⬡",  label: "Dashboard"   },
  { to: "/sites",     icon: "🏭", label: "Sites"        },
  { to: "/analytics", icon: "📊", label: "Analytics"    },
  { to: "/upload",    icon: "📤", label: "Upload Data"  },
];

const NAV_INTEL = [
  { to: "/sales-performance",  icon: "📈", label: "Sales Wise RO Performance"      },
  { to: "/vendor-performance", icon: "🏢", label: "Vendor Wise RO Performance"     },
  { to: "/iot-comparison",     icon: "📡", label: "IoT Enabled vs Non-IoT"         },
];

function Spinner() {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>💧 BPCL RO Intelligence</h1>
        <p>RO Network Performance Platform</p>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV_CORE.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Intelligence Modules</div>
        {NAV_INTEL.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>BPCL RO Intelligence v3.0</p>
        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Network Performance Platform</p>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"                   element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/sites"              element={<Sites />} />
              <Route path="/sites/:id"          element={<SiteDetail />} />
              <Route path="/analytics"          element={<Analytics />} />
              <Route path="/upload"             element={<Upload />} />
              <Route path="/sales-performance"  element={<SalesPerformance />} />
              <Route path="/vendor-performance" element={<VendorPerformance />} />
              <Route path="/iot-comparison"     element={<IoTComparison />} />
            </Routes>
          </Suspense>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0D1F3C",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "#F1F5F9",
            fontSize: "0.83rem",
          },
        }}
      />
    </BrowserRouter>
  );
}
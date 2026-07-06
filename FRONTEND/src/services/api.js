import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

export const getDashboardSummary = () => API.get("/dashboard/summary");
export const getFleetStatus      = () => API.get("/dashboard/fleet");
export const getKPIs = () => API.get("/analytics/kpis");
export const getProductionTrend = (days = 30) => API.get(`/analytics/production?days=${days}`);
export const getEnergyTrend = (days = 30) => API.get(`/analytics/energy?days=${days}`);
export const getAlarmFrequency = () => API.get("/analytics/alarms/frequency");

export const getSites = () => API.get("/sites/");
export const getSite = (id) => API.get(`/sites/${id}`);
export const getSiteDevices = (id) => API.get(`/sites/${id}/devices`);
export const getSiteReadings = (id) => API.get(`/sites/${id}/readings`);
export const getSiteAlarms = (id) => API.get(`/sites/${id}/alarms`);

export const getDevices = (params = {}) => API.get("/devices/", { params });
export const getDevice = (id) => API.get(`/devices/${id}`);
export const getDeviceReadings = (id) => API.get(`/devices/${id}/readings`);
export const postDeviceHeartbeat = (id) => API.put(`/devices/${id}/heartbeat`);
export const postSensorReading = (id, data) => API.post(`/devices/${id}/reading`, data);

export const getAlarms = (params = {}) => API.get("/alarms/", { params });
export const getAlarmStats = () => API.get("/alarms/stats");
export const acknowledgeAlarm = (id, user = "operator") => API.put(`/alarms/${id}/acknowledge?user=${user}`);
export const resolveAlarm = (id) => API.put(`/alarms/${id}/resolve`);

export const seedDatabase  = () => API.post("/seed/run");
export const clearAllData  = () => API.delete("/seed/clear");

// ── BPCL Intelligence Modules ─────────────────────────────────────────────
export const getSalesSummary   = () => API.get("/sales-performance/summary");
export const getSalesAreas     = () => API.get("/sales-performance/areas");
export const getTopAreas       = (n = 10) => API.get(`/sales-performance/top?n=${n}`);
export const getBottomAreas    = (n = 10) => API.get(`/sales-performance/bottom?n=${n}`);
export const getSalesROs       = (salesArea) =>
  API.get("/sales-performance/ros", { params: salesArea ? { sales_area: salesArea } : {} });

export const getVendorSummary  = () => API.get("/vendor-performance/summary");
export const getVendors        = () => API.get("/vendor-performance/vendors");
export const getVendorROs      = (vendorName) =>
  API.get("/vendor-performance/ros", { params: vendorName ? { vendor_name: vendorName } : {} });

export const getIoTSummary     = () => API.get("/iot-comparison/summary");
export const getIoTByArea      = () => API.get("/iot-comparison/by-area");
export const getIoTByVendor    = () => API.get("/iot-comparison/by-vendor");
export const getIoTPerformance = () => API.get("/iot-comparison/performance");

export default API;
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../utils/api";
import VerimedNavbar from "../components/VerimedNavbar";
import "./FakeReports.css";

// City → emoji avatar (mirrors partner logo style)
const CITY_AVATARS = {
  karachi:   "🏙️",
  lahore:    "🌆",
  islamabad: "🏛️",
  rawalpindi:"🏘️",
  peshawar:  "🕌",
  quetta:    "⛰️",
  multan:    "🌅",
  murree:    "🌲",
};

const CITY_COORDS = {
  karachi:   [24.8607, 67.0011],
  lahore:    [31.5204, 74.3587],
  islamabad: [33.6844, 73.0479],
  rawalpindi:[33.5973, 73.0479],
  peshawar:  [34.0151, 71.5249],
  quetta:    [30.1798, 66.9750],
  multan:    [30.1575, 71.5249],
  murree:    [33.9070, 73.3943],
};

function getCityAvatar(location) {
  if (!location) return "📍";
  const key = location.split(",")[0].trim().toLowerCase();
  return CITY_AVATARS[key] || "📍";
}

function getCityCoords(location) {
  if (!location) return null;
  const key = location.split(",")[0].trim().toLowerCase();
  return CITY_COORDS[key] || null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h    = Math.floor(diff / 3.6e6);
  if (h < 1)  return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const CITIES = ["All", "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Quetta", "Multan"];

export default function FakeReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    api.getReports()
      .then(d => setReports(d?.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r => {
    const matchCity   = filter === "All" || r.location.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search ||
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  const blacklisted = reports.filter(r => r.is_blacklisted);
  const underReview = reports.filter(r => !r.is_blacklisted);

  return (
    <div className="fr-screen">
      <VerimedNavbar />

      {/* Hero — mirrors Partners hero, red palette */}
      <div className="fr-hero">
        <div className="fr-hero-content">
          <div className="fr-badge">COMMUNITY REPORTS</div>
          <h1>Reported Fake Medicine Locations</h1>
          <p>
            Community-reported locations where counterfeit or suspicious medicines were found.
            Blacklisted locations are flagged in red and indicate confirmed or repeated incidents.
          </p>
        </div>
        <div className="fr-hero-stats">
          <div className="fr-hero-stat"><span>{reports.length}</span><label>Total Reports</label></div>
          <div className="fr-hero-stat"><span>{blacklisted.length}</span><label>Blacklisted</label></div>
          <div className="fr-hero-stat"><span>{underReview.length}</span><label>Under Review</label></div>
          <div className="fr-hero-stat">
            <span>{new Set(reports.map(r => r.location.split(",")[0].trim())).size}</span>
            <label>Cities</label>
          </div>
        </div>
      </div>

      <div className="fr-body">
        {/* Filter bar — identical to Partners */}
        <div className="fr-filter-bar">
          <input className="fr-search" type="text" placeholder="Search location or description…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="fr-chips">
            {CITIES.map(c => (
              <button key={c} className={`fr-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="fr-loading"><div className="fr-spinner" /><p>Loading reports…</p></div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="fr-empty">
            <div className="fr-empty-avatar">✓</div>
            <h3>No reports in this area</h3>
            <p>This location appears clean. Always verify your medicines using VeriMed before use.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="fr-map-container" style={{ height: "400px", width: "100%", marginBottom: "32px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--vm-border)" }}>
            <MapContainer center={[30.3753, 69.3451]} zoom={5} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {filtered.map(r => {
                const coords = getCityCoords(r.location);
                if (!coords) return null;
                // slightly randomize coords so they don't exactly overlap
                const lat = coords[0] + (Math.random() - 0.5) * 0.05;
                const lng = coords[1] + (Math.random() - 0.5) * 0.05;
                return (
                  <Circle
                    key={r.id}
                    center={[lat, lng]}
                    radius={r.is_blacklisted ? 40000 : 25000} // Radius in meters
                    fillColor={r.is_blacklisted ? "#dc2626" : "#f59e0b"}
                    color="transparent" // Remove border to make it look like a heat blob
                    weight={0}
                    opacity={0}
                    fillOpacity={r.is_blacklisted ? 0.6 : 0.4}
                  >
                    <Popup>
                      <strong>{r.location}</strong><br/>
                      {r.description}<br/>
                      <em>Status: {r.is_blacklisted ? "Blacklisted" : "Under Review"}</em>
                    </Popup>
                  </Circle>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* Cards grid — identical structure to Partners */}
        {!loading && filtered.length > 0 && (
          <div className="fr-grid">
            {filtered.map(r => (
              <div key={r.id} className={`fr-card ${r.is_blacklisted ? "bl" : "review"}`}>
                <div className="fr-card-header">
                  {/* Emoji avatar — mirrors pc-logo */}
                  <div className={`fr-avatar ${r.is_blacklisted ? "bl" : "review"}`}>
                    {getCityAvatar(r.location)}
                  </div>
                  <div className="fr-card-title">
                    <h3>{r.location}</h3>
                    <div className="fr-card-meta">
                      <span className={`fr-status-mark ${r.is_blacklisted ? "bl" : "review"}`}>
                        {r.is_blacklisted ? "Blacklisted" : "Under Review"}
                      </span>
                      {r.batch_id && (
                        <span className="fr-batch-chip">{r.batch_id}</span>
                      )}
                    </div>
                  </div>
                </div>

                {r.description && (
                  <p className="fr-card-desc">"{r.description}"</p>
                )}

                <div className="fr-card-tags">
                  <span className="fr-tag reporter">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {r.reporter_name}
                  </span>
                  <span className="fr-tag time">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {timeAgo(r.reported_at)}
                  </span>
                </div>

                <div className="fr-card-footer">
                  <span className="fr-card-date">{new Date(r.reported_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <Link to="/verify" className="fr-report-link">Report Similar</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA — mirrors Partners join-cta, red palette */}
        <div className="fr-cta">
          <div className="fr-cta-content">
            <h2>Spotted a suspicious medicine?</h2>
            <p>Help protect public health by reporting locations where counterfeit medicines are sold.</p>
          </div>
          <Link to="/verify" className="fr-cta-btn">Submit a Report</Link>
        </div>

        <div className="fr-tip-box">
          <strong>Safety Notice:</strong> If you suspect a counterfeit medicine, do not consume it.
          Contact DRAP (Drug Regulatory Authority Pakistan) at <strong>0800-03727</strong> or
          visit <a href="https://www.dra.gov.pk" target="_blank" rel="noreferrer">dra.gov.pk</a>.
        </div>
      </div>
    </div>
  );
}

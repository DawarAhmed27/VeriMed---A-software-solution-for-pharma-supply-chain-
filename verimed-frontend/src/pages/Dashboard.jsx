// src/pages/Dashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import LogoutButton from "../components/LogoutButton";
import { api } from "../utils/api";

export default function Dashboard() {
  const cardRefs = useRef([]);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role;
  const [stats, setStats] = useState([
    { value: "...", label: "Loading", icon: "LD" },
    { value: "...", label: "Loading", icon: "LD" },
    { value: "...", label: "Loading", icon: "LD" },
  ]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const visibleCards = [
    role === 'manufacturer' && {
      title: "Manufacturing",
      desc: "Create batches and generate QR trails.",
      to: "/manufacturer",
      btnClass: "btn-blue",
      btnText: "Open workspace",
      accent: "#0ea5e9",
    },
    role === 'retailer' && {
      title: "Retail",
      desc: "Manage stock and verify incoming deliveries.",
      to: "/retailer",
      btnClass: "btn-green",
      btnText: "Open workspace",
      accent: "#22c55e",
    },
    role === 'customer' && {
      title: "Customer",
      desc: "Check authenticity and medicine details.",
      to: "/customer",
      btnClass: "btn-purple",
      btnText: "Open workspace",
      accent: "#a855f7",
    },
    {
      title: "Verify Medicine",
      desc: "Scan a QR code to verify a batch.",
      to: "/verify",
      btnClass: "btn-yellow",
      btnText: "Open scanner",
      accent: "#f59e0b",
    },
    {
      title: "About Us",
      desc: "Learn more about VeriMed and our mission",
      to: "/about",
      btnClass: "btn-gray",
      btnText: "Learn more",
      accent: "#64748b",
    },
  ].filter(Boolean);

  // Staggered fade-in animation for the cards
  useEffect(() => {
    cardRefs.current.forEach((card, i) => {
      if (card) {
        card.style.animationDelay = `${0.2 + i * 0.15}s`;
        card.classList.add("card-animate");
      }
    });
  }, []);

  useEffect(() => {
    async function loadDashboardStats() {
      const token = localStorage.getItem('token');

      if (!token) {
        setStats([
          { value: 'Open', label: 'Public verification', icon: 'Verification' },
          { value: 'Live', label: 'Medicine search', icon: 'Search' },
          { value: 'Ready', label: 'Support tools', icon: 'Support' },
        ]);
        return;
      }

      try {
        if (role === 'manufacturer') {
          const [batchesResponse, analyticsResponse] = await Promise.all([
            api.getBatches(token),
            api.getManufacturerAnalytics(token),
          ]);

          const analyticsEntries = Array.isArray(analyticsResponse?.analytics) ? analyticsResponse.analytics : [];
          const createdMetric = analyticsEntries.find((entry) => entry.metric_type === 'batches_created');
          const verifiedMetric = analyticsEntries.find((entry) => entry.metric_type === 'batches_verified');

          setStats([
            { value: String(Array.isArray(batchesResponse?.batches) ? batchesResponse.batches.length : 0), label: 'Current batches', icon: 'Batches' },
            { value: String(createdMetric?.total || 0), label: 'Created this period', icon: 'Production' },
            { value: String(verifiedMetric?.total || 0), label: 'Verified scans', icon: 'Checks' },
          ]);
          return;
        }

        if (role === 'retailer') {
          const [inventoryResponse, statsResponse, expiringResponse] = await Promise.all([
            api.getInventory(token),
            api.getInventoryStats(token),
            api.getExpiringSoon(token),
          ]);

          setStats([
            { value: String(statsResponse?.stats?.total_units || 0), label: 'Inventory units', icon: 'Inventory' },
            { value: String(statsResponse?.stats?.verified_batches || 0), label: 'Verified batches', icon: 'Checks' },
            { value: String(Array.isArray(expiringResponse?.expiring_items) ? expiringResponse.expiring_items.length : 0), label: 'Expiring soon', icon: 'Alerts' },
          ]);
          return;
        }

        setStats([
          { value: 'Open', label: 'Public verification', icon: 'Verification' },
          { value: 'Live', label: 'Medicine search', icon: 'Search' },
          { value: 'Ready', label: 'Support tools', icon: 'Support' },
        ]);
      } catch (dashboardError) {
        console.error('Dashboard stats load error:', dashboardError);
        setStats([
          { value: 'Open', label: 'Public verification', icon: 'Verification' },
          { value: 'Live', label: 'Medicine search', icon: 'Search' },
          { value: 'Ready', label: 'Support tools', icon: 'Support' },
        ]);
      }
    }

    loadDashboardStats();
  }, [role]);

  return (
    <div className="dashboard-screen">
      <div className="container">

        {/* ── Header ── */}
        <div className="dashboard-header">
        <div className="dashboard-actions">
          <LogoutButton className="logout-btn" />
        </div>
        <div className="logo-wrap">
          <div className="logo-ring" />
          <div className="logo-mark dashboard-logo" aria-hidden="true" />
        </div>
        <h1>VeriMed</h1>
        <p className="dashboard-slogan">"Empowering healthier lives with safe, verified medicine every day."</p>
        <div className="dashboard-datetime">
          {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {currentDate.toLocaleTimeString()}
        </div>
        <div className="header-line" />
      </div>

      {/* ── Cards ── */}
      <div className="cards-container">
        {visibleCards.map((card, i) => (
          <div
            key={i}
            className="portal-card"
            ref={(el) => (cardRefs.current[i] = el)}
            style={{ "--accent": card.accent }}
          >
            <div className="card-glow" />
            <div className="card-header">
              <h2>{card.title}</h2>
            </div>
            <p>{card.desc}</p>
            <Link to={card.to} className={`portal-btn ${card.btnClass}`}>
              {card.btnText}
            </Link>
          </div>
        ))}
        </div>


        {/* ── Stats ── */}
        <div className="dashboard-stats">
          {stats.map((s, i) => (
            <div className="stat-item" key={i}>
              <span className="stat-icon">{s.icon}</span>
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Global Impact & Support ── */}
        <div className="dashboard-global-section">
          <div className="dashboard-global-stats">
            <div className="global-stat-card">
              <h3>50+</h3>
              <p>Total Manufacturers</p>
            </div>
            <div className="global-stat-card">
              <h3>1,200+</h3>
              <p>Total Retailers</p>
            </div>
            <div className="global-stat-card">
              <h3>5M+</h3>
              <p>Satisfied Customers</p>
            </div>
          </div>
          
          <div className="dashboard-support">
            <h4>Need Help?</h4>
            <p>Our support team is here to assist you 24/7.</p>
            <div className="support-links">
              <a href="mailto:support@verimed.com" className="support-link">✉ support@verimed.com</a>
              <a href="tel:+18001234567" className="support-link">📞 +1 (800) 123-4567</a>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="dashboard-footer">
          <span>© {new Date().getFullYear()} VeriMed · All rights reserved</span>
        </div>
      </div>
    </div>
  );
}
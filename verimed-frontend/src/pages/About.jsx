// src/pages/About.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./About.css";
import LogoutButton from "../components/LogoutButton";

export default function About() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const role = currentUser?.role;

  return (
    <div className="about-screen">
      
      {/* ── Top Navigation Bar ── */}
      <nav className="web-navbar about-nav">
        <div className="nav-logo">
          <span className="logo-icon logo-mark" aria-hidden="true" />
          <h2>VeriMed <span className="portal-type">| About Us</span></h2>
        </div>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          {role === "manufacturer" && <Link to="/manufacturer">Manufacturer</Link>}
          {role === "retailer" && <Link to="/retailer">Retailer</Link>}
          <Link to="/verify">Verify</Link>
          <LogoutButton className="logout-btn" />
        </div>
      </nav>

      {/* ── Main Web Dashboard Area ── */}
      <div className="web-dashboard-container">
        
        {/* Header Section */}
        <div className="dashboard-header-section">
          <div>
            <h1>About VeriMed</h1>
            <p>Transparency and security in the global pharmaceutical supply chain.</p>
          </div>
        </div>

        <div className="about-main-layout">
          
          {/* Mission Statement Card */}
          <div className="mission-card">
            <div className="brand-logo-large">
              <span className="logo-cross-large logo-mark" aria-hidden="true" />
              <span className="logo-text-large">VeriMed</span>
            </div>
            <p className="mission-text">
              Veri-Med is a cutting-edge platform dedicated to ensuring the safety and authenticity of 
              pharmaceuticals. Our mission is to bring transparency to the global supply chain by 
              connecting manufacturers, pharmacies, and consumers in a secure digital ecosystem.
            </p>
            
            <div className="core-values">
              <h3>Our Core Values</h3>
              <ul className="values-list">
                <li><span className="value-icon">TR</span> <strong>Integrity and Trust</strong></li>
                <li><span className="value-icon">IN</span> <strong>Innovation</strong></li>
                <li><span className="value-icon">PS</span> <strong>Patient Safety</strong></li>
              </ul>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="contact-sidebar">
            <div className="contact-card-dark">
              <h3>Contact Us</h3>
              <div className="contact-item">
                <span className="contact-label">Email :</span>
                <span className="contact-value">support@verimed.com</span>
              </div>
              <div className="contact-item">
                <span className="contact-label">Website :</span>
                <span className="contact-value">www.verimed.com</span>
              </div>
              {/* Send Message button removed as requested */}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
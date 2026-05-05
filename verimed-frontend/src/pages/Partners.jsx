// src/pages/Partners.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import VerimedNavbar from "../components/VerimedNavbar";
import "./Partners.css";

const PARTNERS = [
  { logo: "🏭", name: "Abbott Laboratories Pakistan", category: "Multinational", brands: ["Brufen", "Duphaston", "Clarithromycin", "Thyronorm"], city: "Karachi", since: 2021, description: "A global leader in pharmaceuticals and diagnostics, manufacturing over 200 essential medicines in Pakistan with WHO-certified GMP facilities." },
  { logo: "💊", name: "GlaxoSmithKline Pakistan",     category: "Multinational", brands: ["Augmentin", "Amoxil", "Panadol", "Seretide"],               city: "Karachi", since: 2020, description: "One of the oldest pharmaceutical companies in Pakistan, with ISO-certified manufacturing facilities and over 50 registered products." },
  { logo: "🧬", name: "Getz Pharma",                  category: "Local",         brands: ["Meronem", "Clariget", "Veltam", "Citapax"],                  city: "Karachi", since: 2022, description: "Pakistan's largest pharmaceutical company by market share, with a strong presence across all major therapeutic areas and 35+ export markets." },
  { logo: "⚗️", name: "Sami Pharmaceuticals",          category: "Local",         brands: ["Pantec", "Nexum", "Risek", "Pamidronate"],                  city: "Karachi", since: 2022, description: "Award-winning manufacturer known for high-quality generic and branded formulations, with operations spanning 35+ countries globally." },
  { logo: "🔬", name: "Searle Pakistan",               category: "Local",         brands: ["Sizodon", "Trileptal", "Atorva", "Claricin"],               city: "Karachi", since: 2023, description: "A leading diversified healthcare company listed on the Pakistan Stock Exchange, operating across OTC and prescription pharmaceutical segments." },
  { logo: "🌐", name: "Pfizer Pakistan",               category: "Multinational", brands: ["Diflucan", "Norvasc", "Zithromax", "Xanax"],               city: "Karachi", since: 2021, description: "Global pharmaceutical giant operating in Pakistan with a focus on cardiovascular, anti-infective and women's health medicines." },
  { logo: "🏥", name: "Ferozsons Laboratories",        category: "Local",         brands: ["Peflox", "Traxon", "Citralka", "Hepaforte"],               city: "Lahore",  since: 2023, description: "Lahore-based manufacturer and distributor with a 70-year heritage in Pakistan's pharmaceutical industry." },
  { logo: "🧪", name: "ICI Pakistan – Pharma Division",category: "Local",         brands: ["Sotalol", "Milrinone", "Dexamethasone-ICI", "Atenolol-ICI"],city: "Lahore",  since: 2022, description: "ICI's pharmaceutical arm produces a range of generic and specialty medicines under GMP-certified, internationally audited conditions." },
  { logo: "💉", name: "Novartis Pakistan",             category: "Multinational", brands: ["Voltaren", "Coversyl", "Lamisil", "Foradil"],              city: "Karachi", since: 2020, description: "Swiss multinational with a strong local presence in dermatology, oncology and cardiovascular medicine segments across Pakistan." },
];

const CATEGORIES = ["All", "Multinational", "Local"];

export default function Partners() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch]  = useState("");

  const visible = PARTNERS.filter(p => {
    const matchCat    = filter === "All" || p.category === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brands.some(b => b.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="partners-screen">
      <VerimedNavbar />

      {/* Hero */}
      <div className="partners-hero">
        <div className="partners-hero-content">
          <div className="ph-badge">OFFICIAL PARTNERS</div>
          <h1>Trusted Pharmaceutical Manufacturers</h1>
          <p>
            VeriMed collaborates with Pakistan's leading medicine manufacturers to ensure
            every batch is traceable, authenticated and safe for patients.
          </p>
        </div>
        <div className="ph-stats">
          <div className="ph-stat"><span>{PARTNERS.length}</span><label>Partners</label></div>
          <div className="ph-stat"><span>{PARTNERS.filter(p => p.category === "Multinational").length}</span><label>Multinational</label></div>
          <div className="ph-stat"><span>{PARTNERS.filter(p => p.category === "Local").length}</span><label>Local</label></div>
          <div className="ph-stat"><span>2020</span><label>Est.</label></div>
        </div>
      </div>

      <div className="partners-body">
        {/* Filter bar */}
        <div className="partners-filter-bar">
          <input className="partners-search" type="text" placeholder="Search by company or brand name…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="partners-chips">
            {CATEGORIES.map(c => (
              <button key={c} className={`partners-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="partners-grid">
          {visible.map(p => (
            <div key={p.name} className="partner-card">
              <div className="pc-header">
                {/* Emoji profile picture — restored */}
                <div className="pc-logo">{p.logo}</div>
                <div className="pc-title">
                  <h3>{p.name}</h3>
                  <div className="pc-meta">
                    <span className={`pc-cat-mark ${p.category === "Multinational" ? "multi" : "local"}`}>
                      {p.category}
                    </span>
                    <span className="pc-city">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {p.city}
                    </span>
                    <span className="pc-verified">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      VeriMed Verified
                    </span>
                  </div>
                </div>
              </div>

              <p className="pc-desc">{p.description}</p>

              <div className="pc-brands">
                <span className="pc-brands-label">Key Brands</span>
                {p.brands.map(b => <span key={b} className="pc-brand-tag">{b}</span>)}
              </div>

              <div className="pc-footer">
                <span className="pc-since">Partner since {p.since}</span>
                <Link to="/verify" className="pc-verify-link">Verify a Batch</Link>
              </div>
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="partners-empty"><p>No partners match your search.</p></div>
        )}

        {/* CTA */}
        <div className="partners-join-cta">
          <div className="pj-content">
            <h2>Are you a pharmaceutical manufacturer?</h2>
            <p>Join VeriMed to track your batches and help fight counterfeiting across Pakistan.</p>
          </div>
          <Link to="/signup" className="pj-btn">Join as Manufacturer</Link>
        </div>
      </div>
    </div>
  );
}

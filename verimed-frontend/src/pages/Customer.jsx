// src/pages/Customer.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './Customer.css'
import { api } from '../utils/api'
import VerimedNavbar from '../components/VerimedNavbar'

export default function Customer() {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const isCustomer = currentUser?.role === 'customer'
  const [medicine, setMedicine] = useState('')
  const [city, setCity]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!medicine.trim() && !city.trim()) {
      setSearchError('Please enter a medicine name or city to search.')
      return
    }
    setSearching(true)
    setSearchError('')
    setHasSearched(false)
    try {
      const result = await api.searchMedicineStock(medicine, city)
      setSearchResults(Array.isArray(result?.results) ? result.results : [])
      setHasSearched(true)
    } catch {
      setSearchError('Unable to search stock right now. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="customer-screen">
      <VerimedNavbar />

      {/* ── Partners-style Hero with integrated search ── */}
      <div className="portal-hero purple-hero">
        <div className="portal-hero-content customer-hero-content">
          <div className="portal-hero-badge">CUSTOMER PORTAL</div>
          <h1>Find Medicine Near You</h1>
          <p>Search live pharmacy stock across Pakistan and verify medicine authenticity in seconds.</p>

          {/* Search bar inside hero */}
          <form className="hero-search-form" onSubmit={handleSearch}>
            <input className="hero-search-input" type="text"
              placeholder="Medicine name (e.g. Paracetamol)"
              value={medicine} onChange={e => setMedicine(e.target.value)} />
            <input className="hero-search-input" type="text"
              placeholder="City or area (e.g. Lahore)"
              value={city} onChange={e => setCity(e.target.value)} />
            <button className="hero-search-btn" type="submit" disabled={searching}>
              {searching ? 'Searching…' : 'Search Stock'}
            </button>
          </form>
          {searchError && <p className="hero-search-error">{searchError}</p>}
        </div>
        <div className="portal-hero-stats">
          <div className="portal-hero-stat"><span>9</span><label>Partners</label></div>
          <div className="portal-hero-stat"><span>Live</span><label>Stock Data</label></div>
          <div className="portal-hero-stat"><span>Free</span><label>Always</label></div>
        </div>
      </div>

      <div className="web-dashboard-container">

        {!isCustomer && (
          <p className="portal-role-warning">
            This portal is for customers only. Some features may be restricted.
          </p>
        )}

        {/* Search results */}
        {(hasSearched || searching) && (
          <div className="customer-results-section">
            <div className="dashboard-header-section" style={{ marginBottom: 20 }}>
              <h1>
                {searching ? 'Searching…' : `${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''} Found`}
              </h1>
              {hasSearched && searchResults.length > 0 && (
                <p>Showing pharmacies with <strong>{medicine}</strong>{city ? ` in ${city}` : ''}</p>
              )}
            </div>

            {/* Result cards — Partners card style */}
            {searchResults.length > 0 ? (
              <div className="customer-results-grid">
                {searchResults.map((result, idx) => (
                  <article className="customer-result-card" key={`${result.batch_id}-${idx}`}>
                    <div className="crc-header">
                      {/* Pharmacy avatar */}
                      <div className="crc-avatar">🏪</div>
                      <div className="crc-title">
                        <h3>{result.medicine_name}</h3>
                        {result.generic_name && result.generic_name !== result.medicine_name && (
                          <span className="crc-generic">({result.generic_name})</span>
                        )}
                        <div className="crc-meta">
                          <span className="crc-pharmacy">{result.company_name || 'Pharmacy'}</span>
                          <span className="crc-stock-badge">{result.quantity_in_stock} in stock</span>
                        </div>
                      </div>
                    </div>

                    <div className="crc-details">
                      {(result.address || result.city) && (
                        <div className="crc-detail-row">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{result.address || result.city}{result.state ? `, ${result.state}` : ''}</span>
                        </div>
                      )}
                      {result.contact_phone && (
                        <div className="crc-detail-row">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <a href={`tel:${result.contact_phone}`} className="crc-phone">{result.contact_phone}</a>
                        </div>
                      )}
                      <div className="crc-detail-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        <span>Batch <strong>{result.batch_id}</strong> · Expires {result.expiry_date}</span>
                      </div>
                    </div>

                    <div className="crc-footer">
                      <span className="crc-since">Live stock data</span>
                      <div className="crc-actions">
                        {result.address && (
                          <a className="crc-action-btn directions" href={`https://maps.google.com/?q=${encodeURIComponent(result.address)}`} target="_blank" rel="noopener noreferrer">
                            Directions
                          </a>
                        )}
                        {result.contact_phone && (
                          <a className="crc-action-btn call" href={`tel:${result.contact_phone}`}>Call</a>
                        )}
                        {result.website_url && (
                          <a className="crc-action-btn order" href={result.website_url.startsWith('http') ? result.website_url : `https://${result.website_url}`} target="_blank" rel="noopener noreferrer">
                            Order Online
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="customer-empty">
                <div className="customer-empty-avatar">🔍</div>
                <h3>No results found</h3>
                <p>No pharmacies found for "<strong>{medicine}</strong>"{city ? ` in "${city}"` : ''}. Try a different name or city.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Feature cards — Partners card grid style */}
        {!hasSearched && !searching && (
          <>
            <div className="dashboard-header-section">
              <h1>What You Can Do</h1>
            </div>
            <div className="customer-feature-grid">
              <div className="customer-feature-card">
                <div className="cfc-avatar">🔬</div>
                <div className="cfc-body">
                  <h3>Verify Medicines</h3>
                  <p>Scan the QR code on any medicine packaging to verify authenticity and check batch details instantly.</p>
                  <Link to="/verify" className="cfc-link">Start Verification</Link>
                </div>
              </div>
              <div className="customer-feature-card">
                <div className="cfc-avatar">📦</div>
                <div className="cfc-body">
                  <h3>Batch Information</h3>
                  <p>View detailed information about medicine batches, manufacturing dates, expiry, and manufacturer.</p>
                  <Link to="/verify" className="cfc-link">Look Up Batch</Link>
                </div>
              </div>
              <div className="customer-feature-card">
                <div className="cfc-avatar">🚨</div>
                <div className="cfc-body">
                  <h3>Report Fake Medicine</h3>
                  <p>Spot a suspicious medicine? Report the location and help protect public health across Pakistan.</p>
                  <Link to="/fake-reports" className="cfc-link">View Reports</Link>
                </div>
              </div>
              <div className="customer-feature-card">
                <div className="cfc-avatar">🤝</div>
                <div className="cfc-body">
                  <h3>Verified Partners</h3>
                  <p>See the list of officially verified pharmaceutical manufacturers that partner with VeriMed.</p>
                  <Link to="/partners" className="cfc-link">View Partners</Link>
                </div>
              </div>
            </div>

            {/* CTA block */}
            <div className="portal-hero blue-hero" style={{ borderRadius: 20, marginTop: 32 }}>
              <div className="portal-hero-content">
                <div className="portal-hero-badge">SAFETY FIRST</div>
                <h1 style={{ fontSize: 22 }}>Don't trust — verify</h1>
                <p>Always check your medicine with VeriMed before consumption. It takes 10 seconds and could save your life.</p>
              </div>
              <Link to="/verify" className="pj-btn" style={{ textDecoration: 'none', display: 'inline-block', padding: '13px 26px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, boxShadow: '0 4px 14px rgba(59,130,246,.4)' }}>
                Verify a Medicine
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

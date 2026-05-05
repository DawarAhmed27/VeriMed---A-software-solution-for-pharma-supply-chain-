// src/components/VerimedNavbar.jsx
// Shared navigation bar used across all public and authenticated pages.
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import './VerimedNavbar.css';

export default function VerimedNavbar({ subtitle }) {
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem('user') || 'null');
  const role      = user?.role;
  const [open, setOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const isActive = (path) => location.pathname === path ? 'vm-nav-link active' : 'vm-nav-link';

  return (
    <nav className="vm-nav">
      {/* Brand */}
      <Link to={role ? '/dashboard' : '/verify'} className="vm-brand">
        <span className="vm-brand-mark" aria-hidden="true" />
        <span className="vm-brand-name">
          VeriMed
          {subtitle && <span className="vm-brand-sub"> {subtitle}</span>}
        </span>
      </Link>

      {/* Desktop links */}
      <div className="vm-links">
        <Link to="/verify"       className={isActive('/verify')}>Verify</Link>
        <Link to="/customer"     className={isActive('/customer')}>Find Stock</Link>
        <Link to="/fake-reports" className={isActive('/fake-reports')}>Reports</Link>
        <Link to="/partners"     className={isActive('/partners')}>Partners</Link>

        {role === 'manufacturer' && <Link to="/manufacturer" className={isActive('/manufacturer')}>Manufacturer</Link>}
        {role === 'retailer'     && <Link to="/retailer"     className={isActive('/retailer')}>Retailer</Link>}
        {role                    && <Link to="/dashboard"    className={isActive('/dashboard')}>Dashboard</Link>}

        {role
          ? <LogoutButton className="vm-logout-btn" />
          : <Link to="/" className="vm-login-btn">Log In</Link>
        }
        
        <button 
          onClick={toggleDarkMode} 
          className="vm-theme-toggle" 
          aria-label="Toggle Dark Mode"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', marginLeft: '12px', borderRadius: '50%' }}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Mobile hamburger */}
      <button className="vm-hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      {open && (
        <div className="vm-mobile-menu">
          <Link to="/verify"       onClick={() => setOpen(false)}>Verify</Link>
          <Link to="/customer"     onClick={() => setOpen(false)}>Find Stock</Link>
          <Link to="/fake-reports" onClick={() => setOpen(false)}>Reports</Link>
          <Link to="/partners"     onClick={() => setOpen(false)}>Partners</Link>
          {role === 'manufacturer' && <Link to="/manufacturer" onClick={() => setOpen(false)}>Manufacturer</Link>}
          {role === 'retailer'     && <Link to="/retailer"     onClick={() => setOpen(false)}>Retailer</Link>}
          {role                    && <Link to="/dashboard"    onClick={() => setOpen(false)}>Dashboard</Link>}
          {role ? <LogoutButton className="vm-logout-btn" /> : <Link to="/">Log In</Link>}
        </div>
      )}
    </nav>
  );
}

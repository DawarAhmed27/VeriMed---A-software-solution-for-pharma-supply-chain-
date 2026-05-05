// src/pages/Signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { api } from "../utils/api";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manufacturer");
  const [company, setCompany] = useState("");
  const [license, setLicense] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!username.trim() || !email.trim() || !password.trim() || !fullName.trim()) {
      setError('Please fill required fields');
      return;
    }

    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        company_name: company.trim(),
        license_number: license.trim()
      };

      const result = await api.register(payload);
      if (result && result.message === 'User registered successfully') {
        setSuccess("User Registered Successfully");
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">

        <div className="brand">
          <div className="brand-icon logo-mark" aria-hidden="true" />
          <h1>VeriMed</h1>
        </div>

        <form onSubmit={handleSignup}>
          <div className="input-box">
            <span>Name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Full Name" />
          </div>

          <div className="input-box">
            <span>User</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" />
          </div>

          <div className="input-box">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email Address" />
          </div>

          <div className="input-box">
            <span>PW</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 6 chars, 1 number)" title="Password must be at least 6 characters with at least one number" />
          </div>
          {password && (password.length < 6 || !/\d/.test(password)) && (
            <p style={{ color: "#f59e0b", fontSize: "12px", margin: "-10px 0 10px 0" }}>
              {password.length < 6 ? "✓ Min 6 characters " : "✓ 6+ characters"} | {/\d/.test(password) ? "✓ Has number" : "✗ Needs 1 digit"}
            </p>
          )}

          <div className="input-box">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }}>
              <option value="manufacturer">Manufacturer</option>
              <option value="retailer">Retailer</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {role !== 'customer' && (
            <>
              <div className="input-box">
                <span>Org</span>
                <input value={company} onChange={(e) => setCompany(e.target.value)} type="text" placeholder="Company (optional)" />
              </div>

              <div className="input-box">
                <span>License</span>
                <input value={license} onChange={(e) => setLicense(e.target.value)} type="text" placeholder="License # (optional)" />
              </div>
            </>
          )}

          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success" style={{ color: "#10b981", fontSize: "14px", textAlign: "center", fontWeight: "600", margin: "-8px 0 10px 0" }}>{success}</p>}

          <button type="submit" className="login-btn">Sign Up</button>
        </form>

        <div className="links">
          <p className="signup-text">Already have an account ? <Link to="/" className="signup-link">Sign In</Link></p>
        </div>

      </div>
    </div>
  );
}
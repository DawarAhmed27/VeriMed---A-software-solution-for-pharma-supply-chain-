// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <div className="login-screen">
      <div className="login-card">

        <div className="brand">
          <div className="brand-icon logo-mark" aria-hidden="true" />
          <h1>VeriMed</h1>
        </div>

        {!submitted ? (
          <>
            <p style={{ textAlign: "center", color: "#64748b", fontSize: "14px", margin: "0" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="input-box">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn">
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📧</div>
            <p style={{ color: "#16a34a", fontWeight: "600", fontSize: "15px", margin: "0 0 8px" }}>
              Reset link sent!
            </p>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "0" }}>
              Check your inbox at <strong>{email}</strong>
            </p>
          </div>
        )}

        <div className="links">
          <p className="signup-text">
            Remember your password? <Link to="/" className="signup-link">Sign In</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

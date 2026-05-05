// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { api } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      const result = await api.login(username.trim(), password);
      if (result && result.token) {
        // Save token and user to localStorage
        localStorage.setItem('token', result.token);
        if (result.user) localStorage.setItem('user', JSON.stringify(result.user));
        if (result.user?.role === 'manufacturer') {
          navigate('/manufacturer');
        } else if (result.user?.role === 'retailer') {
          navigate('/retailer');
        } else if (result.user?.role === 'customer') {
          navigate('/customer');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="login-screen">
      <div className="container">
        <div className="login-card">

        <div className="brand">
          <div className="brand-icon logo-mark" aria-hidden="true" />
          <h1>VeriMed</h1>
        </div>

        <form onSubmit={handleLogin}>
          <div className={`input-box ${error ? "input-error" : ""}`}>
            <span>ID</span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
            />
          </div>

          <div className={`input-box ${error ? "input-error" : ""}`}>
            <span>PW</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="login-error">{error}</p>
          )}

          <button type="submit" className="login-btn">
            Secure Login
          </button>
        </form>

        <div className="links">
          <Link to="/forgot" className="forgot-link">Forgot Password ?</Link>
          <p className="signup-text">
            Don't have an account ? <Link to="/signup" className="signup-link">Sign Up</Link>
          </p>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <button type="button" onClick={() => navigate('/verify')} className="quick-scan-btn">
          Open Medicine Scanner
        </button>

        </div>
      </div>
    </div>
  );
}

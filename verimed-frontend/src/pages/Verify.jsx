// src/pages/Verify.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import jsQR from "jsqr";
import "./Verify.css";
import { api } from "../utils/api";
import VerimedNavbar from "../components/VerimedNavbar";

function extractBatchId(qrData) {
  return qrData.trim();
}

// ── Inline SVG icons (no emojis) ──────────────────────────────
const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconFlag = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);

export default function Verify() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const [cameraOn, setCameraOn]   = useState(false);
  const [scanError, setScanError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult]       = useState(null);
  const [manualId, setManualId]   = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ location: "", description: "", reporter_name: "" });
  const [reportStatus, setReportStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function startCamera() {
    setScanError(""); setResult(null); setShowReport(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
        startScanning();
      }
    } catch {
      setScanError("Camera access denied. Use the Batch ID field below instead.");
    }
  }

  function stopCamera() {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    clearInterval(scanIntervalRef.current);
  }

  function startScanning() {
    clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data) {
          stopCamera();
          verifyBatch(extractBatchId(code.data));
        }
      }
    }, 500);
  }

  useEffect(() => () => stopCamera(), []);

  async function verifyBatch(batchId) {
    if (!batchId) return;
    setIsVerifying(true); setScanError(""); setResult(null); setShowReport(false);
    const token = localStorage.getItem("token") || "";
    try {
      const data = await api.publicVerifyBatch(batchId, token);
      if (data?.message === "Batch not found" || (!data?.success && !data?.batch_info)) {
        setResult({ found: false, batchId });
        return;
      }
      setResult({ found: true, authentic: data.success, status: data.verification_status, batch: data.batch_info, retailer: data.retailer_info || null });
    } catch {
      setScanError("Could not reach the server. Please check your connection.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleManualSubmit(e) {
    e?.preventDefault();
    if (manualId.trim()) verifyBatch(manualId.trim());
  }

  function reset() {
    setResult(null); setScanError(""); setManualId("");
    setShowReport(false); setReportStatus(""); setReportForm({ location: "", description: "", reporter_name: "" });
  }

  async function handleReport(e) {
    e.preventDefault();
    if (!reportForm.location.trim()) return;
    setSubmitting(true);
    try {
      await api.submitReport({ batch_id: result?.batchId || manualId || "", ...reportForm });
      setReportStatus("ok");
    } catch {
      setReportStatus("err");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  }

  const statusBarColor = { valid: "#15803d", expired: "#b45309", counterfeit: "#dc2626", recalled: "#991b1b" };

  return (
    <div className="verify-screen">
      <VerimedNavbar />

      {/* ── Partners-style Hero ── */}
      <div className="portal-hero teal-hero">
        <div className="portal-hero-content">
          <div className="portal-hero-badge">AUTHENTICITY CHECK</div>
          <h1>Verify Your Medicine</h1>
          <p>Scan the QR code or enter the Batch ID to authenticate any medicine sold across Pakistan. Free, instant, and trustworthy.</p>
        </div>
        <div className="portal-hero-stats">
          <div className="portal-hero-stat"><span>9</span><label>Partners</label></div>
          <div className="portal-hero-stat"><span>24/7</span><label>Available</label></div>
          <div className="portal-hero-stat"><span>Free</span><label>Always</label></div>
          <div className="portal-hero-stat"><span>Instant</span><label>Results</label></div>
        </div>
      </div>

      <div className="web-dashboard-container">
        <div className="verify-main-layout">
          {/* Left — scanner + manual */}
          <div className="verify-card-large">
            <div className="verify-icon-wrap">
              <IconShield />
              <span>AUTHENTICITY CHECK</span>
            </div>
            <h2>Check Your Medicine</h2>
            <p>Use the camera to scan the QR code or type the Batch ID manually to verify authenticity.</p>

            {/* Camera viewport */}
            {!result && (
              <div className="scanner-placeholder">
                <video ref={videoRef} style={{ display: cameraOn ? "block" : "none", width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {!cameraOn && !isVerifying && <><div className="scan-line" /><span className="qr-guide">Position QR code within this frame</span></>}
                {cameraOn && <div className="scan-line" />}
                {isVerifying && (
                  <div className="loading-spinner">
                    <div className="spinner" />
                    <p>Verifying batch…</p>
                  </div>
                )}
              </div>
            )}

            {!result && (
              <button className="scan-qr-btn" onClick={cameraOn ? stopCamera : startCamera} disabled={isVerifying}>
                <span className="btn-icon">{cameraOn ? <IconStop /> : <IconCamera />}</span>
                {isVerifying ? "Verifying…" : cameraOn ? "Stop Camera" : "Scan QR Code"}
              </button>
            )}

            {scanError && <p className="verify-inline-error">{scanError}</p>}

            {/* Manual entry */}
            {!result && (
              <div className="manual-verify-section">
                <div className="manual-divider"><span>OR ENTER BATCH ID MANUALLY</span></div>
                <form className="manual-verify-form" onSubmit={handleManualSubmit}>
                  <input
                    className="manual-verify-input"
                    type="text"
                    placeholder="e.g. BT-20260502111802-8340"
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    disabled={isVerifying}
                  />
                  <button className="manual-verify-btn" type="submit" disabled={isVerifying || !manualId.trim()}>
                    {isVerifying ? "…" : "Verify"}
                  </button>
                </form>
                <p className="manual-hint">The Batch ID is printed on the back or side of the medicine box or strip.</p>
              </div>
            )}

            {/* Result: Found */}
            {result?.found && (
              <div className={`verify-result-card ${result.authentic ? "authentic" : "inauthentic"}`}>
                <div className="vr-status-bar" style={{ background: statusBarColor[result.status] || "#475569" }}>
                  <span className="vr-status-icon">{result.authentic ? <IconCheck /> : <IconX />}</span>
                  <span className="vr-status-text">
                    {result.authentic
                      ? "Genuine — Batch Verified Successfully"
                      : result.status === "expired"
                        ? "Batch Expired — Do Not Use"
                        : result.status === "recalled"
                          ? "🚨 BATCH RECALLED — DO NOT CONSUME"
                          : "Verification Failed — Potentially Counterfeit"}
                  </span>
                </div>

                <div className="vr-details">
                  <div className="vr-section-title">Batch Information</div>
                  <div className="vr-grid">
                    <div className="vr-row"><span>Medicine</span><strong>{result.batch?.medicine_name}</strong></div>
                    <div className="vr-row"><span>Batch ID</span><code>{result.batch?.batch_id}</code></div>
                    <div className="vr-row"><span>Manufacturer</span><strong>{result.batch?.manufacturer || "—"}</strong></div>
                    <div className="vr-row"><span>Manufactured</span><strong>{formatDate(result.batch?.manufacturing_date)}</strong></div>
                    <div className="vr-row">
                      <span>Expiry Date</span>
                      <strong style={{ color: result.batch?.is_expired ? "#dc2626" : "#16a34a" }}>
                        {formatDate(result.batch?.expiry_date)}
                        <span className="expiry-badge" style={{ background: result.batch?.is_expired ? "#fee2e2" : "#dcfce7", color: result.batch?.is_expired ? "#dc2626" : "#15803d" }}>
                          {result.batch?.is_expired ? "Expired" : "Valid"}
                        </span>
                      </strong>
                    </div>
                    <div className="vr-row"><span>Batch Quantity</span><strong>{result.batch?.quantity ?? "—"} units</strong></div>
                  </div>
                </div>

                <div className="vr-card-footer">
                  <button className="scan-qr-btn secondary" onClick={reset} style={{ width: "100%" }}>
                    <span className="btn-icon"><IconRefresh /></span> Verify Another Batch
                  </button>
                </div>
              </div>
            )}

            {/* Result: Not found */}
            {result && !result.found && !showReport && !reportStatus && (
              <div className="verify-not-found">
                <div className="vnf-icon-wrap"><IconAlert /></div>
                <h3>Batch Not Found</h3>
                <p>
                  Batch ID <code>{result.batchId || manualId}</code> is not registered with any VeriMed manufacturer.
                  This medicine may be <strong>counterfeit</strong>.
                </p>
                <p className="vnf-sub">Do not consume this medicine. You can report the location to alert other patients.</p>
                <div className="vnf-actions">
                  <button className="vnf-report-btn" onClick={() => setShowReport(true)}>
                    <span className="btn-icon"><IconFlag /></span> Report This Location
                  </button>
                  <button className="vnf-reset-btn" onClick={reset}>Try Another Batch</button>
                </div>
              </div>
            )}

            {/* Report form */}
            {showReport && !reportStatus && (
              <form className="report-form" onSubmit={handleReport}>
                <div className="rf-header">
                  <div className="rf-icon-wrap"><IconFlag /></div>
                  <div>
                    <h3>Report Suspected Counterfeit</h3>
                    <p>Your report will be reviewed and the location flagged for other users.</p>
                  </div>
                </div>
                <label className="rf-label">Location of purchase <span>*</span></label>
                <input className="rf-input" type="text" placeholder="e.g. Raja Bazaar, Rawalpindi"
                  value={reportForm.location} onChange={e => setReportForm(f => ({ ...f, location: e.target.value }))} required />
                <label className="rf-label">Description</label>
                <textarea className="rf-input rf-textarea" rows="3"
                  placeholder="Describe the suspicious medicine (packaging, colour, price, etc.)"
                  value={reportForm.description} onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))} />
                <label className="rf-label">Your Name (optional)</label>
                <input className="rf-input" type="text" placeholder="Anonymous"
                  value={reportForm.reporter_name} onChange={e => setReportForm(f => ({ ...f, reporter_name: e.target.value }))} />
                <div className="rf-actions">
                  <button type="submit" className="rf-submit-btn" disabled={submitting || !reportForm.location.trim()}>
                    {submitting ? "Submitting…" : "Submit Report"}
                  </button>
                  <button type="button" className="rf-cancel-btn" onClick={() => setShowReport(false)}>Cancel</button>
                </div>
              </form>
            )}

            {reportStatus === "ok" && (
              <div className="report-success">
                <div className="rs-icon-wrap"><IconCheck /></div>
                <h3>Report Submitted</h3>
                <p>Thank you for helping protect public health. The location has been flagged for review.</p>
                <Link to="/fake-reports" className="rs-link">View All Reported Locations</Link>
                <button className="scan-qr-btn secondary" onClick={reset} style={{ marginTop: 12, width: "100%" }}>
                  Verify Another Batch
                </button>
              </div>
            )}

            {reportStatus === "err" && (
              <p className="verify-inline-error">Failed to submit report. Please try again.</p>
            )}
          </div>

          {/* Sidebar */}
          <div className="verify-sidebar">
            <div className="info-widget">
              <h4>How to Verify</h4>
              <ol className="vm-list">
                <li>Scan the QR code on the medicine box, <em>or</em></li>
                <li>Enter the <strong>Batch ID</strong> printed on the packaging</li>
                <li>View full batch, manufacturer and expiry details</li>
                <li>If not found — report the location for review</li>
              </ol>
            </div>

            <div className="info-widget">
              <h4>Warning Signs</h4>
              <ul className="vm-list">
                {["Broken or missing tamper seals", "Blurry or misspelled labels", "No batch code printed on box", "Price significantly below market rate", "Different colour or texture than usual"].map(w => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>

            <div className="info-widget sidebar-cta-card">
              <h4>Official Partners</h4>
              <p>These manufacturers are verified VeriMed partners. Always buy from authorised retailers.</p>
              <Link to="/partners" className="sidebar-partner-btn">View All Partners</Link>
            </div>

            <div className="info-widget sidebar-cta-card danger-cta">
              <h4>Reported Locations</h4>
              <p>View locations flagged by community members for suspected counterfeit medicines.</p>
              <Link to="/fake-reports" className="sidebar-partner-btn danger-btn">View Report Map</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

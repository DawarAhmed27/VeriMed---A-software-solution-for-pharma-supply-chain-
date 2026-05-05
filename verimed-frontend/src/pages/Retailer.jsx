// src/pages/Retailer.jsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import jsQR from "jsqr";
import "./Retailer.css";
import { api } from "../utils/api";
import VerimedNavbar from "../components/VerimedNavbar";

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue.includes("T") ? dateValue : `${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Retailer() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isRetailer = currentUser?.role === "retailer";
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ total_batches: 0, total_units: 0, total_sold: 0, verified_batches: 0 });
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [addQty, setAddQty] = useState(1);
  const [addSuccess, setAddSuccess] = useState(false);
  const [manualBatchId, setManualBatchId] = useState("");


  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    async function loadRetailerData() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please sign in again to view inventory.");
        setLoading(false);
        return;
      }

      if (!isRetailer) {
        setError("This portal is for retailer accounts only.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Load inventory first — this is the critical one
        const inventoryResponse = await api.getInventory(token);
        const inventoryItems = Array.isArray(inventoryResponse?.inventory) ? inventoryResponse.inventory : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const normalizedInventory = inventoryItems.map((item) => {
          const expiryDate = new Date(`${item.expiry_date}T00:00:00`);
          const dayDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          let alert = null;

            if (!Number.isNaN(expiryDate.getTime())) {
              if (item.batch_status === 'recalled') {
                alert = "RECALLED";
              } else if (dayDiff < 0) {
                alert = "Expired";
              } else if (dayDiff <= 30) {
                alert = "Expiring Soon";
              }
            } else if (item.batch_status === 'recalled') {
              alert = "RECALLED";
            }

          return {
            name: item.medicine_name || "Unknown Medicine",
            id: item.batch_id || "-",
            qty: `${item.quantity_in_stock ?? 0} units`,
            rawQty: item.quantity_in_stock ?? 0,
            expires: formatDate(item.expiry_date),
            received: formatDate(item.received_date),
            alert,
          };
        });

        setInventory(normalizedInventory);

        // Compute stats locally from inventory data as the reliable source
        const totalUnits = normalizedInventory.reduce((sum, i) => sum + i.rawQty, 0);
        const totalBatches = normalizedInventory.length;
        const expiringSoonCount = normalizedInventory.filter(i => i.alert === "Expiring Soon").length;

        // Try the stats endpoint too (non-critical)
        try {
          const statsResponse = await api.getInventoryStats(token);
          const s = statsResponse?.stats;
          setStats({
            total_batches:    s?.total_batches    ?? totalBatches,
            total_units:      Number(s?.total_units ?? totalUnits),
            total_sold:       Number(s?.total_sold  ?? 0),
            verified_batches: Number(s?.verified_batches ?? 0),
          });
        } catch (_) {
          // Fall back to locally-computed stats
          setStats({ total_batches: totalBatches, total_units: totalUnits, total_sold: 0, verified_batches: 0 });
        }

        // Try expiring soon (non-critical)
        try {
          const expiringResponse = await api.getExpiringSoon(token);
          setExpiringSoon(Array.isArray(expiringResponse?.expiring_items) ? expiringResponse.expiring_items : []);
        } catch (_) {
          setExpiringSoon([]);
        }

      } catch (loadError) {
        console.error("Retailer load error:", loadError);
        setError("Unable to load retailer inventory from the server.");
      } finally {
        setLoading(false);
      }
    }

    loadRetailerData();
  }, [isRetailer]);

  const sortedInventory = useMemo(() => inventory, [inventory]);

  // ── QR Scanner helpers ──────────────────────────────────────────────────────
  async function startCamera() {
    setScanError("");
    setScanResult(null);
    setAddSuccess(false);
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
    } catch (err) {
      setScanError("Camera access denied. Please allow camera permissions in your browser.");
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
  }

  function startScanning() {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          verifyScannedBatch(code.data.trim());
        }
      }
    }, 500);
  }

  async function verifyScannedBatch(batchId) {
    setVerifying(true);
    setScanError("");
    const token = localStorage.getItem("token") || "";
    try {
      const result = await api.publicVerifyBatch(batchId, token);
      if (!result || result.raw) {
        // Non-JSON response or empty body
        setScanError("Server error — could not verify batch. Please try again.");
        return;
      }
      if (result.message === 'Batch not found') {
        setScanError(`Batch "${batchId}" not found in the database. Check the ID and try again.`);
        return;
      }
      const isAuthentic = result?.success ?? result?.is_authentic;
      const batchQty = result?.batch_info?.quantity ?? 0;
      setScanResult({
        batchId,
        isAuthentic,
        status: result?.verification_status,
        info: result?.batch_info,
        message: result?.message,
      });
      setAddQty(batchQty); // auto-fill from manufacturer's batch quantity
    } catch (err) {
      console.error("Verification error:", err);
      setScanError(`Verification error: ${err?.message || "Could not reach server. Check your connection."}`);
    } finally {
      setVerifying(false);
    }
  }

  async function handleAddToInventory() {
    if (addingToInventory || !scanResult?.isAuthentic) return;
    const token = localStorage.getItem("token");
    if (!token) { setScanError("Please log in again."); return; }

    setAddingToInventory(true);
    setScanError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await api.addToInventory(token, {
        batch_id: scanResult.batchId,
        quantity_received: Number(addQty),
        received_date: today,
        // received_from_user intentionally omitted — backend uses NULL to avoid FK issues
      });

      if (result?.message?.toLowerCase().includes("success") || result?.message?.toLowerCase().includes("added")) {
        setAddSuccess(true);
        // Reload inventory list
        const inventoryResponse = await api.getInventory(token);
        const inventoryItems = Array.isArray(inventoryResponse?.inventory) ? inventoryResponse.inventory : [];
        const today2 = new Date();
        today2.setHours(0, 0, 0, 0);
        setInventory(inventoryItems.map((item) => {
          const expiryDate = new Date(`${item.expiry_date}T00:00:00`);
          const dayDiff = Math.ceil((expiryDate - today2) / (1000 * 60 * 60 * 24));
          let alert = null;
          if (!Number.isNaN(expiryDate.getTime())) {
            if (item.batch_status === 'recalled') alert = "RECALLED";
            else if (dayDiff < 0) alert = "Expired";
            else if (dayDiff <= 30) alert = "Expiring Soon";
          } else if (item.batch_status === 'recalled') {
            alert = "RECALLED";
          }
          return {
            name: item.medicine_name || "Unknown Medicine",
            id: item.batch_id || "-",
            qty: `${item.quantity_in_stock ?? 0} units`,
            expires: formatDate(item.expiry_date),
            received: formatDate(item.received_date),
            alert,
          };
        }));
        setTimeout(() => {
          setShowScanner(false);
          setScanResult(null);
          setAddSuccess(false);
          setCameraOn(false);
        }, 1800);
      } else {
        setScanError(result?.message || "Failed to add to inventory.");
      }
    } catch (err) {
      setScanError(err?.message || "Error adding to inventory.");
    } finally {
      setAddingToInventory(false);
    }
  }

  function closeScanner() {
    stopCamera();
    setShowScanner(false);
    setScanResult(null);
    setScanError("");
    setAddSuccess(false);
    setManualBatchId("");
  }

  async function handleManualVerify() {
    const id = manualBatchId.trim();
    if (!id || verifying) return;
    stopCamera(); // stop camera if running
    setScanResult(null);
    setScanError("");
    setAddSuccess(false);
    await verifyScannedBatch(id);
  }

  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="retailer-screen">
      <VerimedNavbar />

      {/* ── Partners-style Hero ── */}
      <div className="portal-hero green-hero">
        <div className="portal-hero-content">
          <div className="portal-hero-badge">RETAILER PORTAL</div>
          <h1>Inventory &amp; Delivery Management</h1>
          <p>Verify incoming deliveries, manage your medicine stock and track batch expiry dates in real time.</p>
        </div>
        <div className="portal-hero-stats">
          <div className="portal-hero-stat">
            <span>{loading ? "—" : (stats.total_units || 0)}</span>
            <label>Total Units</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : (stats.total_batches || 0)}</span>
            <label>Batches</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : expiringSoon.length}</span>
            <label>Expiring Soon</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : (stats.verified_batches || 0)}</span>
            <label>Verified</label>
          </div>
        </div>
      </div>

      <div className="web-dashboard-container">
        <div className="dashboard-header-section">
          <div>
            <h1>Current Inventory</h1>
            <p>Manage local stock and verify incoming deliveries.</p>
          </div>
          <button className="scan-delivery-btn" onClick={() => { setScanResult(null); setScanError(""); setShowScanner(true); }}>
            Receive Delivery
          </button>
        </div>

        <div className="recent-batches-section">
          <div className="section-header-row">
            <h2>Current Inventory</h2>
            <button className="sort-btn">Sorted by expiry</button>
          </div>

          {error && <p style={{ color: "#b91c1c", marginBottom: "16px" }}>{error}</p>}
          
          <div className="web-batch-table">
            <div className="table-header">
              <span>Product</span>
              <span>Batch ID</span>
              <span>Stock Level</span>
              <span>Expiry Date</span>
              <span>Alerts</span>
            </div>

            {loading ? (
              <div className="table-row">
                <div className="cell" style={{ gridColumn: "1 / -1" }}>Loading inventory...</div>
              </div>
            ) : sortedInventory.length > 0 ? (
              sortedInventory.map((item, index) => (
              <div className="table-row" key={index}>
                <div className="cell product-cell">
                  <span className="box-icon">RX</span>
                  <span className="product-name">{item.name}</span>
                </div>
                <div className="cell">{item.id}</div>
                <div className="cell">{item.qty}</div>
                <div className="cell">{item.expires}</div>
                <div className="cell">
                  {item.alert === "RECALLED" ? (
                    <span className="alert-badge" style={{ backgroundColor: "#dc2626", color: "white", padding: "4px 8px", borderRadius: "12px", fontWeight: "bold" }}>🚨 RECALLED</span>
                  ) : item.alert ? (
                    <span className="alert-badge">{item.alert}</span>
                  ) : (
                    <span className="status-badge-neutral">Stable</span>
                  )}
                </div>
              </div>
              ))
            ) : (
              <div className="table-row">
                <div className="cell" style={{ gridColumn: "1 / -1" }}>No inventory found yet. Use the scanner to receive your first delivery.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QR Scanner Modal ── */}
      {showScanner && (
        <div className="modal-overlay" onClick={closeScanner}>
          <div className="retailer-scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-modal-header">
              <h2>📦 Receive Delivery</h2>
              <button className="modal-close-x" onClick={closeScanner}>✕</button>
            </div>

            <p className="scanner-subtitle">
              Scan the QR code on the incoming batch to verify it against the database and add it to your inventory.
            </p>

            {/* Camera area */}
            <div className="retailer-camera-box">
              <video
                ref={videoRef}
                style={{
                  display: cameraOn ? "block" : "none",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {!cameraOn && !scanResult && !verifying && (
                <div className="camera-placeholder">
                  <div className="camera-icon">📷</div>
                  <p>Camera off — press Start Scanning</p>
                </div>
              )}

              {verifying && (
                <div className="scanner-verifying">
                  <div className="spinner" />
                  <p>Verifying batch against database...</p>
                </div>
              )}

              {/* Result card */}
              {scanResult && (
                <div className={`scan-result-card ${scanResult.isAuthentic ? "authentic" : "counterfeit"}`}>
                  <div className="scan-result-icon">
                    {scanResult.isAuthentic ? "✅" : "❌"}
                  </div>
                  <h3>{scanResult.isAuthentic ? "Batch Verified" : "Verification Failed"}</h3>
                  <p className="scan-result-status">{scanResult.message}</p>
                  {scanResult.info && (
                    <div className="scan-result-info">
                      <div className="scan-info-row">
                        <span>Medicine</span>
                        <strong>{scanResult.info.medicine_name}</strong>
                      </div>
                      <div className="scan-info-row">
                        <span>Batch ID</span>
                        <strong className="mono">{scanResult.info.batch_id}</strong>
                      </div>
                      <div className="scan-info-row">
                        <span>Manufacturer</span>
                        <strong>{scanResult.info.manufacturer}</strong>
                      </div>
                      <div className="scan-info-row">
                        <span>Expiry</span>
                        <strong>{scanResult.info.expiry_date}</strong>
                      </div>
                      <div className="scan-info-row">
                        <span>Batch Quantity</span>
                        <strong>{scanResult.info.quantity ?? addQty} units</strong>
                      </div>
                    </div>
                  )}

                  {scanResult.isAuthentic && !addSuccess && (
                    <div className="add-inventory-row">
                      <div className="qty-display">
                        <span className="qty-label">Batch Quantity</span>
                        <strong className="qty-value">{addQty} units</strong>
                        <span className="qty-note">(set by manufacturer)</span>
                      </div>
                      <button
                        className="add-inventory-btn"
                        onClick={handleAddToInventory}
                        disabled={addingToInventory}
                      >
                        {addingToInventory ? "Adding..." : "Add to Inventory"}
                      </button>
                    </div>
                  )}

                  {addSuccess && (
                    <div className="add-success-msg">✓ Added to inventory successfully!</div>
                  )}
                </div>
              )}
            </div>

            {scanError && <p className="scan-error-msg">{scanError}</p>}

            <div className="scanner-actions">
              {!scanResult ? (
                <button
                  className="scanner-btn"
                  onClick={cameraOn ? stopCamera : startCamera}
                  disabled={verifying}
                >
                  {verifying ? "Verifying..." : cameraOn ? "⏹ Stop Camera" : "▶ Start Scanning"}
                </button>
              ) : (
                <button
                  className="scanner-btn secondary"
                  onClick={() => { setScanResult(null); setScanError(""); setAddSuccess(false); setManualBatchId(""); }}
                >
                  🔄 Scan Another Batch
                </button>
              )}
            </div>

            {/* ── Manual Batch ID entry ── */}
            {!scanResult && (
              <div className="manual-entry-section">
                <div className="manual-divider">
                  <span className="manual-divider-text">or enter Batch ID manually</span>
                </div>
                <div className="manual-input-row">
                  <input
                    type="text"
                    className="manual-batch-input"
                    placeholder="e.g. BT-20260502-AB12"
                    value={manualBatchId}
                    onChange={(e) => setManualBatchId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleManualVerify(); }}
                    disabled={verifying}
                  />
                  <button
                    className="manual-verify-btn"
                    onClick={handleManualVerify}
                    disabled={verifying || !manualBatchId.trim()}
                  >
                    {verifying ? "..." : "Verify"}
                  </button>
                </div>
                <p className="manual-hint">
                  💡 Copy the Batch ID shown on the manufacturer's screen after creating a batch.
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
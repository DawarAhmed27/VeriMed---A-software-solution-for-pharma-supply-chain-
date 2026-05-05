// src/pages/Manufacturer.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Manufacturer.css";
import { api } from "../utils/api";
import VerimedNavbar from "../components/VerimedNavbar";

const MEDICINES = [
  "Amoxicillin 500mg",
  "Ibuprofen 200mg",
  "Lisinopril 10mg",
  "Metformin 850mg",
  "Paracetamol 500mg",
  "Azithromycin 250mg",
  "Omeprazole 20mg",
  "Atorvastatin 40mg",
];

function generateFallbackValue(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${randomPart}`;
}

function toDisplayBatch(batch) {
  const productionDate = batch.created_at
    ? new Date(batch.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : batch.manufacturing_date || "-";

  return {
    name: batch.medicine_name || batch.name || "Unknown Medicine",
    id: batch.batch_id || batch.id || "-",
    rawId: batch.batch_id || batch.id || "-",
    units: `${batch.quantity ?? batch.units ?? 0} units`,
    date: productionDate,
    status: batch.batch_status || batch.status || "Active",
    expiry_date: batch.expiry_date,
  };
}

const EMPTY_DISPATCH = {
  retailer_name: "",
  retailer_contact: "",
  retailer_location: "",
  retailer_website: "",
  quantity: "",
  delivery_date: "",
};

export default function Manufacturer() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ medicine: "", quantity: "", expiry: "" });
  const [qrReady, setQrReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedBatch, setSavedBatch] = useState(null); // holds real batch after save
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);

  // Dispatch modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchBatchId, setDispatchBatchId] = useState(null);
  const [dispatchBatchName, setDispatchBatchName] = useState("");
  const [dispatchForm, setDispatchForm] = useState(EMPTY_DISPATCH);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isManufacturer = currentUser?.role === "manufacturer";

  const formComplete = form.medicine && form.quantity && form.expiry;

  const medicineOptions = useMemo(() => {
    if (medicines.length > 0) {
      return medicines.map((medicine) => ({
        id: medicine.id,
        name: medicine.medicine_name,
      }));
    }
    return MEDICINES.map((medicineName) => ({
      id: null,
      name: medicineName,
    }));
  }, [medicines]);

  async function loadManufacturerData() {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in again to load your batches.");
      setLoading(false);
      return;
    }

    if (!isManufacturer) {
      setError("This portal is for manufacturer accounts. Please sign in with a manufacturer account to create batches.");
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [batchesResponse, medicinesResponse] = await Promise.all([
        api.getBatches(token),
        api.getMedicines(token),
      ]);

      if (Array.isArray(medicinesResponse?.medicines)) {
        setMedicines(medicinesResponse.medicines);
      }

      const fetchedBatches = Array.isArray(batchesResponse?.batches) ? batchesResponse.batches : [];
      setRecentBatches(fetchedBatches.map(toDisplayBatch));
    } catch (err) {
      console.error("Manufacturer load error:", err);
      setError("Unable to load batches from the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManufacturerData();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "medicine" || name === "quantity" || name === "expiry") {
      setQrReady(false);
      setSaved(false);
      setError("");
    }
  }

  function handleGenerate() {
    // kept for legacy ref — button now calls handleSave directly
    if (!formComplete) return;
    handleSave();
  }

  async function handleSave() {
    if (saving || !formComplete) return;

    const token = localStorage.getItem("token");
    if (!token) { setError("Please log in again to create a batch."); return; }
    if (!isManufacturer) { setError("This portal requires a manufacturer account."); return; }

    setQrReady(true); // show spinner in the status area
    setSaving(true);
    setError("");

    try {
      // Step 1: resolve medicine ID — use cached list first, no extra fetch
      let medicineId = medicineOptions.find((m) => m.name === form.medicine)?.id ?? null;

      if (!medicineId) {
        // Medicine not in list — create it and grab the ID from the response directly
        const createRes = await api.createMedicine(token, {
          medicine_name: form.medicine,
          generic_name: form.medicine,
          dosage: form.medicine.split(" ").slice(-1)[0] || "500mg",
          active_ingredient: form.medicine,
          manufacturer_info: "VeriMed manufacturer",
        });
        medicineId = createRes?.medicine_id ?? null;
      }

      if (!medicineId) throw new Error("Could not resolve medicine record.");

      // Step 2: create batch (QR generated server-side)
      const today = new Date().toISOString().slice(0, 10);
      const result = await api.createBatch(token, {
        medicine_id: medicineId,
        quantity: Number(form.quantity),
        manufacturing_date: today,
        expiry_date: form.expiry,
        serial_number: generateFallbackValue("SN"),
        lot_number: generateFallbackValue("LOT"),
      });

      const batch = result?.batch;
      if (!batch) throw new Error(result?.message || "Batch creation failed.");

      // Update list locally — no need to re-fetch everything
      setRecentBatches((prev) => [toDisplayBatch(batch), ...prev]);
      setSavedBatch(batch);
      setSaved(true);
    } catch (err) {
      console.error("Create batch error:", err);
      setError(err?.message || "Failed to create batch.");
    } finally {
      setSaving(false);
    }
  }


  function handleClose() {
    setShowModal(false);
    setQrReady(false);
    setSaved(false);
    setSavedBatch(null);
    setError("");
    setForm({ medicine: "", quantity: "", expiry: "" });
  }

  async function viewBatchDetail(batchId) {
    const token = localStorage.getItem("token");
    if (!token) return;

    setDetailLoading(true);
    try {
      const response = await api.getBatchDetail(token, batchId);
      if (response?.batch) {
        setSelectedBatch(response.batch);
        setSelectedHistory(response.history || []);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error("Error fetching batch details:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleCloseDetail() {
    setShowDetailModal(false);
    setSelectedBatch(null);
    setSelectedHistory([]);
  }

  async function handleRecallBatch(batchId) {
    if (!window.confirm(`Are you absolutely sure you want to RECALL batch ${batchId}? This will trigger an alert across the supply chain.`)) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.recallBatch(token, batchId);
      if (res.success) {
        alert("Batch recalled successfully. Alerts have been sent.");
        loadManufacturerData(); // reload batches
        if (showDetailModal) {
          handleCloseDetail();
        }
      } else {
        alert(res.message || "Failed to recall batch.");
      }
    } catch (err) {
      alert("Error recalling batch.");
    }
  }

  // ── Dispatch modal helpers ─────────────────────────────────────────────────
  function openDispatchModal(batch) {
    setDispatchBatchId(batch.rawId);
    setDispatchBatchName(batch.name);
    setDispatchForm(EMPTY_DISPATCH);
    setDispatchError("");
    setDispatchSuccess(false);
    setShowDispatchModal(true);
  }

  function handleDispatchChange(e) {
    const { name, value } = e.target;
    setDispatchForm((prev) => ({ ...prev, [name]: value }));
    setDispatchError("");
  }

  async function handleDispatch() {
    if (dispatching) return;
    const { retailer_name, retailer_contact, retailer_location, quantity } = dispatchForm;
    if (!retailer_name || !retailer_contact || !retailer_location || !quantity) {
      setDispatchError("Please fill in all required fields.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { setDispatchError("Please log in again."); return; }

    setDispatching(true);
    setDispatchError("");

    try {
      const result = await api.dispatchBatch(token, dispatchBatchId, {
        retailer_name: dispatchForm.retailer_name,
        retailer_contact: dispatchForm.retailer_contact,
        retailer_location: dispatchForm.retailer_location,
        retailer_website: dispatchForm.retailer_website,
        quantity: Number(dispatchForm.quantity),
        delivery_date: dispatchForm.delivery_date || undefined,
      });

      if (result?.delivery) {
        setDispatchSuccess(true);
        setTimeout(() => {
          setShowDispatchModal(false);
          setDispatchSuccess(false);
        }, 1800);
      } else {
        throw new Error(result?.message || "Dispatch failed.");
      }
    } catch (err) {
      setDispatchError(err?.message || "Failed to dispatch batch.");
    } finally {
      setDispatching(false);
    }
  }

  function closeDispatchModal() {
    setShowDispatchModal(false);
    setDispatchBatchId(null);
    setDispatchBatchName("");
    setDispatchForm(EMPTY_DISPATCH);
    setDispatchError("");
    setDispatchSuccess(false);
  }
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="manufacturer-screen">
      <VerimedNavbar />

      {/* ── Partners-style Hero ── */}
      <div className="portal-hero blue-hero">
        <div className="portal-hero-content">
          <div className="portal-hero-badge">MANUFACTURER PORTAL</div>
          <h1>Batch Production &amp; QR Management</h1>
          <p>Create medicine batches, generate QR codes, and dispatch verified stock to authorised retailers.</p>
        </div>
        <div className="portal-hero-stats">
          <div className="portal-hero-stat">
            <span>{loading ? "—" : recentBatches.length}</span>
            <label>Active Batches</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : recentBatches.reduce((t, b) => t + (Number.parseInt(b.units, 10) || 0), 0).toLocaleString()}</span>
            <label>Units Produced</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : recentBatches.filter(b => b.status === 'active').length}</span>
            <label>In Circulation</label>
          </div>
          <div className="portal-hero-stat">
            <span>{loading ? "—" : recentBatches.filter(b => b.status === 'expired').length}</span>
            <label>Expired</label>
          </div>
        </div>
      </div>

      <div className="web-dashboard-container">
        <div className="dashboard-header-section">
          <div>
            <h1>Medicine Batches</h1>
            <p>Manage medicine batches, inventory levels, and quality control.</p>
          </div>
          <button className="create-batch-btn-web" onClick={() => setShowModal(true)} disabled={!isManufacturer}>
            Create Batch
          </button>
        </div>

        {!isManufacturer && (
          <p style={{ color: "#b45309", marginBottom: "16px" }}>
            You are signed in as a retailer. Create batch is only available for manufacturer accounts.
          </p>
        )}

        {error && <p style={{ color: "#dc2626", marginBottom: "16px" }}>{error}</p>}

        <div className="recent-batches-section">
          <h2>Recent Batches</h2>
          <div className="web-batch-table">
            <div className="table-header">
              <span>Product</span>
              <span>Batch ID</span>
              <span>Quantity</span>
              <span>Production Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {loading ? (
              <div className="table-row">
                <div className="cell" style={{ gridColumn: "1 / -1" }}>Loading batches...</div>
              </div>
            ) : recentBatches.length > 0 ? (
              recentBatches.map((batch) => (
                <div className="table-row" key={batch.rawId}>
                  <div className="cell product-cell">
                    <span className="box-icon">MD</span>
                    <span className="product-name">{batch.name}</span>
                  </div>
                  <div className="cell">{batch.rawId}</div>
                  <div className="cell">{batch.units}</div>
                  <div className="cell">{batch.date}</div>
                  <div className="cell">
                    <span className="status-badge">{batch.status}</span>
                  </div>
                  <div className="cell batch-actions">
                    <button
                      className="action-btn-small view-btn"
                      onClick={() => viewBatchDetail(batch.rawId)}
                      disabled={detailLoading}
                      title="View Details"
                    >
                      View
                    </button>
                    {batch.status !== 'recalled' && (
                      <button
                        className="action-btn-small dispatch-btn"
                        onClick={() => openDispatchModal(batch)}
                        title="Dispatch to Retailer"
                      >
                        Dispatch
                      </button>
                    )}
                    {batch.status !== 'recalled' && (
                      <button
                        className="action-btn-small dispatch-btn"
                        style={{ backgroundColor: "#dc2626", borderColor: "#dc2626" }}
                        onClick={() => handleRecallBatch(batch.rawId)}
                        title="Recall this Batch"
                      >
                        Recall
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="table-row">
                <div className="cell" style={{ gridColumn: "1 / -1" }}>No batches found yet.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Batch Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-logo-icon logo-mark" aria-hidden="true" />
                <span className="modal-logo-text">VeriMed</span>
              </div>
              <button className="modal-close-btn" onClick={handleClose}>✕</button>
            </div>

            {/* ── After save: show real QR ── */}
            {saved && savedBatch ? (
              <div className="batch-saved-view">
                <div className="saved-success-banner">
                  <span className="batch-success-icon">&#10003;</span>
                  <span>Batch Created Successfully!</span>
                </div>

                <div className="saved-batch-meta">
                  <div className="saved-meta-row">
                    <span className="saved-meta-label">Medicine</span>
                    <span className="saved-meta-value">{savedBatch.medicine_name}</span>
                  </div>
                  <div className="saved-meta-row">
                    <span className="saved-meta-label">Batch ID</span>
                    <span className="saved-meta-value mono">{savedBatch.batch_id}</span>
                  </div>
                  <div className="saved-meta-row">
                    <span className="saved-meta-label">Quantity</span>
                    <span className="saved-meta-value">{savedBatch.quantity} units</span>
                  </div>
                  <div className="saved-meta-row">
                    <span className="saved-meta-label">Expiry</span>
                    <span className="saved-meta-value">{savedBatch.expiry_date}</span>
                  </div>
                </div>

                {savedBatch.qr_code_base64 ? (
                  <div className="real-qr-section">
                    <p className="real-qr-label">
                      📱 This is the <strong>real QR code</strong> — scan this with the retailer portal to receive the batch
                    </p>
                    <div className="real-qr-frame">
                      <img
                        src={`data:image/png;base64,${savedBatch.qr_code_base64}`}
                        alt={`QR for batch ${savedBatch.batch_id}`}
                        className="real-qr-img"
                      />
                    </div>
                    <p className="real-qr-hint">Batch ID embedded in QR: <code>{savedBatch.batch_id}</code></p>
                  </div>
                ) : (
                  <p className="modal-error">QR code image not available. Use the Batch ID above.</p>
                )}

                <button className="modal-save-btn saved" onClick={handleClose}>
                  ✓ Done — Close
                </button>
              </div>
            ) : (
              /* ── Form (before save) ── */
              <>
                <h2 className="modal-heading">Create batch</h2>

                <div className="modal-field">
                  <label className="modal-label" htmlFor="medicine">Medicine</label>
                  <input
                    type="text"
                    name="medicine"
                    id="medicine"
                    placeholder="Choose or type a medicine"
                    value={form.medicine}
                    onChange={handleChange}
                    className="modal-input"
                    list="medicine-list"
                  />
                  <datalist id="medicine-list">
                    {medicineOptions.map((m) => <option key={m.name} value={m.name} />)}
                  </datalist>
                </div>

                <div className="modal-field">
                  <label className="modal-label" htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    id="quantity"
                    placeholder="Enter quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    className="modal-input"
                    min="1"
                  />
                </div>

                <div className="modal-field">
                  <label className="modal-label" htmlFor="expiry">Expiry date</label>
                  <input
                    type="date"
                    name="expiry"
                    id="expiry"
                    value={form.expiry}
                    onChange={handleChange}
                    className={`modal-input date-input ${form.expiry ? "has-value" : ""}`}
                  />
                </div>

                <div className="qr-status-area">
                  {saving ? (
                    <div className="qr-generating-spinner" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 60 60" fill="none" style={{ opacity: 0.35 }}>
                      <rect x="4" y="4" width="22" height="22" rx="2" stroke="#94a3b8" strokeWidth="2.5" fill="none"/>
                      <rect x="9" y="9" width="12" height="12" rx="1" fill="#94a3b8"/>
                      <rect x="34" y="4" width="22" height="22" rx="2" stroke="#94a3b8" strokeWidth="2.5" fill="none"/>
                      <rect x="39" y="9" width="12" height="12" rx="1" fill="#94a3b8"/>
                      <rect x="4" y="34" width="22" height="22" rx="2" stroke="#94a3b8" strokeWidth="2.5" fill="none"/>
                      <rect x="9" y="39" width="12" height="12" rx="1" fill="#94a3b8"/>
                      <rect x="34" y="34" width="4" height="4" fill="#94a3b8"/>
                      <rect x="42" y="34" width="4" height="4" fill="#94a3b8"/>
                      <rect x="50" y="34" width="6" height="4" fill="#94a3b8"/>
                      <rect x="34" y="42" width="4" height="4" fill="#94a3b8"/>
                      <rect x="42" y="42" width="14" height="4" fill="#94a3b8"/>
                      <rect x="34" y="50" width="10" height="6" fill="#94a3b8"/>
                      <rect x="50" y="50" width="6" height="6" fill="#94a3b8"/>
                    </svg>
                  )}
                  <span className="qr-status-text">
                    {saving ? "Generating QR & saving to database..." : "QR code will be generated on save"}
                  </span>
                </div>

                {error && <p className="modal-error">{error}</p>}

                <button
                  className={`modal-generate-btn ${formComplete && !saving ? "active" : "disabled"}`}
                  onClick={handleGenerate}
                  disabled={!formComplete || saving}
                >
                  {saving ? "SAVING BATCH..." : "GENERATE & SAVE BATCH"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Dispatch Batch Modal ── */}
      {showDispatchModal && (
        <div className="modal-overlay" onClick={closeDispatchModal}>
          <div className="modal-card dispatch-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-logo-icon logo-mark" aria-hidden="true" />
                <span className="modal-logo-text">Dispatch Batch</span>
              </div>
              <button className="modal-close-btn" onClick={closeDispatchModal}>✕</button>
            </div>

            <div className="dispatch-batch-label">
              <span className="dispatch-badge">📦 {dispatchBatchId}</span>
              <span className="dispatch-medicine">{dispatchBatchName}</span>
            </div>

            <p className="dispatch-subtitle">
              Enter the retailer details where this batch is being sent. Customers will see this info when they search for this medicine.
            </p>

            <div className="dispatch-grid">
              <div className="modal-field">
                <label className="modal-label" htmlFor="retailer_name">Retailer / Pharmacy Name <span className="req">*</span></label>
                <input
                  type="text"
                  id="retailer_name"
                  name="retailer_name"
                  className="modal-input"
                  placeholder="e.g. MedPlus Pharmacy Lahore"
                  value={dispatchForm.retailer_name}
                  onChange={handleDispatchChange}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label" htmlFor="retailer_contact">Contact Number <span className="req">*</span></label>
                <input
                  type="text"
                  id="retailer_contact"
                  name="retailer_contact"
                  className="modal-input"
                  placeholder="e.g. +92-300-1234567"
                  value={dispatchForm.retailer_contact}
                  onChange={handleDispatchChange}
                />
              </div>

              <div className="modal-field dispatch-field-full">
                <label className="modal-label" htmlFor="retailer_location">Location / Address <span className="req">*</span></label>
                <input
                  type="text"
                  id="retailer_location"
                  name="retailer_location"
                  className="modal-input"
                  placeholder="e.g. 24-B, Gulberg III, Lahore"
                  value={dispatchForm.retailer_location}
                  onChange={handleDispatchChange}
                />
              </div>

              <div className="modal-field dispatch-field-full">
                <label className="modal-label" htmlFor="retailer_website">Website / Order URL <span className="optional">(optional)</span></label>
                <input
                  type="url"
                  id="retailer_website"
                  name="retailer_website"
                  className="modal-input"
                  placeholder="https://pharmacy.example.com"
                  value={dispatchForm.retailer_website}
                  onChange={handleDispatchChange}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label" htmlFor="d_quantity">Quantity to Dispatch <span className="req">*</span></label>
                <input
                  type="number"
                  id="d_quantity"
                  name="quantity"
                  className="modal-input"
                  placeholder="e.g. 500"
                  min="1"
                  value={dispatchForm.quantity}
                  onChange={handleDispatchChange}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label" htmlFor="delivery_date">Delivery Date</label>
                <input
                  type="date"
                  id="delivery_date"
                  name="delivery_date"
                  className={`modal-input date-input ${dispatchForm.delivery_date ? "has-value" : ""}`}
                  value={dispatchForm.delivery_date}
                  onChange={handleDispatchChange}
                />
              </div>
            </div>

            {dispatchError && <p className="modal-error">{dispatchError}</p>}

            {dispatchSuccess ? (
              <button className="modal-save-btn saved" disabled>
                ✓ DISPATCHED SUCCESSFULLY
              </button>
            ) : (
              <button
                className="modal-save-btn dispatch-submit-btn"
                onClick={handleDispatch}
                disabled={dispatching}
              >
                {dispatching ? "DISPATCHING..." : "CONFIRM DISPATCH"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Batch Detail Modal ── */}
      {showDetailModal && selectedBatch && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-logo-icon logo-mark" aria-hidden="true" />
                <span className="modal-logo-text">Batch Details</span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseDetail}>✕</button>
            </div>

            <div className="detail-modal-content">
              <div className="detail-section">
                <h3>Medicine Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Medicine:</span>
                  <span className="detail-value">{selectedBatch.medicine_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Batch ID:</span>
                  <span className="detail-value mono">{selectedBatch.batch_id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Manufacturer:</span>
                  <span className="detail-value">{selectedBatch.manufacturer}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Batch Details</h3>
                <div className="detail-row">
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{selectedBatch.quantity} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Manufacturing Date:</span>
                  <span className="detail-value">{selectedBatch.manufacturing_date}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expiry Date:</span>
                  <span className="detail-value">{selectedBatch.expiry_date}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    <span className="status-badge" style={{ textTransform: "capitalize" }}>{selectedBatch.batch_status}</span>
                  </span>
                </div>
              </div>

              {selectedBatch.qr_code_base64 && (
                <div className="detail-section qr-display-section">
                  <h3>QR Code</h3>
                  <div className="qr-display">
                    <img
                      src={`data:image/png;base64,${selectedBatch.qr_code_base64}`}
                      alt="Batch QR Code"
                      className="qr-display-image"
                    />
                  </div>
                  <p className="qr-info">Scan this QR code to verify the batch</p>
                </div>
              )}

              <div className="detail-section blockchain-ledger">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  Immutable Ledger (Blockchain)
                </h3>
                <div className="ledger-timeline">
                  {selectedHistory.map((event, idx) => {
                    // Generate a fake SHA256 hash using the event ID and timestamp
                    const mockHash = "0x" + Array.from(String(event.id) + event.timestamp + event.event_type)
                      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
                      .toString(16).padEnd(64, "0").substring(0, 64);
                      
                    return (
                      <div className="ledger-block" key={event.id}>
                        <div className="ledger-block-header">
                          <span className="block-number">Block #{selectedHistory.length - idx}</span>
                          <span className="block-time">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="ledger-block-body">
                          <div className="block-row"><strong>Event:</strong> <span style={{ textTransform: 'uppercase', color: '#10b981', fontWeight: 'bold' }}>{event.event_type}</span></div>
                          <div className="block-row"><strong>Location:</strong> {event.location}</div>
                          <div className="block-row"><strong>Actor:</strong> {event.username} ({event.scanned_by_role})</div>
                          <div className="block-row hash-row">
                            <strong>Tx Hash:</strong>
                            <span className="hash-string">{mockHash}</span>
                          </div>
                        </div>
                        {idx < selectedHistory.length - 1 && <div className="ledger-link">↓</div>}
                      </div>
                    );
                  })}
                  {selectedHistory.length === 0 && <p style={{ color: '#64748b' }}>No ledger history found.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

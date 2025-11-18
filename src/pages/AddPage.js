import React, { useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const hardhatChainId = "0x7A69";

function AddPage() {
  // ============ State (unchanged contract-related state)
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [qrHash, setQrHash] = useState("");

  // KYC fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [passport, setPassport] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [voterId, setVoterId] = useState("");

  // focus for input polish
  const [focusField, setFocusField] = useState(null);

  // Modal and loader states
  const [showModal, setShowModal] = useState(false);
  const [modalHash, setModalHash] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Recent uploads: {hash, name, timestamp}
  const [recentUploads, setRecentUploads] = useState([]);

  // per-field errors
  const [errors, setErrors] = useState({});

  // load recent uploads from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentUploads");
      if (raw) setRecentUploads(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load recent uploads", e);
    }
  }, []);

  // ======= Helpers (no contract logic changes)
  const switchToLocalhost = async () => {
    if (!window.ethereum) { alert("MetaMask required"); return false; }
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hardhatChainId }] });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: hardhatChainId, chainName: "Hardhat Localhost", rpcUrls: ["http://127.0.0.1:8545"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
          });
          return true;
        } catch (addError) { console.error(addError); return false; }
      }
      console.error(error);
      return false;
    }
  };

  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + hashHex;
  };

  const getSigner = async () => {
    if (!window.ethereum) { alert("MetaMask required"); return null; }
    const switched = await switchToLocalhost();
    if (!switched) return null;
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  // ===== Validation regexes (India-specific)
  const RE_AADHAAR = /^[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/; // or plain 12-digit with first 2-9
  const RE_PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const RE_PASSPORT = /^[A-Z][0-9]{7}$/;
  const RE_DL = /^[A-Z]{2}[-\s]?[0-9]{2}[-\s]?(?:19|20)[0-9]{2}[-\s]?[0-9]{7}$/; // common pattern (state + rto + year + serial)
  const RE_VOTER = /^[A-Z]{3}[0-9]{7}$/; // EPIC typical pattern
  const RE_PHONE = /^[6-9][0-9]{9}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validation functions
  // validateField is used for onBlur - it sets errors state
  const validateField = (name, value) => {
    let err = "";
    const v = (value || "").toString().trim();

    switch (name) {
      case "fullName":
        if (!v) err = "Full name is required";
        break;
      case "dob":
        if (!v) err = "Date of birth is required";
        break;
      case "phone":
        if (!v) err = "Phone required";
        else if (!RE_PHONE.test(v)) err = "Invalid Indian mobile (10 digits, starts 6-9)";
        break;
      case "email":
        if (!v) err = "Email required";
        else if (!RE_EMAIL.test(v)) err = "Invalid email";
        break;
      case "aadhaar":
        if (v && !RE_AADHAAR.test(v)) err = "Invalid Aadhaar (12 digits, starts 2-9)";
        break;
      case "pan":
        if (v && !RE_PAN.test(v.toUpperCase())) err = "Invalid PAN (e.g. ABCDE1234F)";
        break;
      case "passport":
        if (v && !RE_PASSPORT.test(v.toUpperCase())) err = "Invalid passport (e.g. A1234567)";
        break;
      case "drivingLicense":
        if (v && !RE_DL.test(v.toUpperCase())) err = "Invalid driving licence (common national format)";
        break;
      case "voterId":
        if (v && !RE_VOTER.test(v.toUpperCase())) err = "Invalid Voter ID (EPIC: AAA1234567)";
        break;
      default:
        break;
    }

    setErrors(prev => ({ ...prev, [name]: err }));
    return err === "";
  };

  // Pure validator - DOES NOT call setState. Returns object of errors (empty string means no error)
  const getValidationErrors = () => {
    const errs = {};

    const check = (name, value) => {
      const v = (value || "").toString().trim();
      switch (name) {
        case "fullName":
          errs.fullName = v ? "" : "Full name is required";
          break;
        case "dob":
          errs.dob = v ? "" : "Date of birth is required";
          break;
        case "phone":
          if (!v) errs.phone = "Phone required";
          else if (!RE_PHONE.test(v)) errs.phone = "Invalid Indian mobile (10 digits, starts 6-9)";
          else errs.phone = "";
          break;
        case "email":
          if (!v) errs.email = "Email required";
          else if (!RE_EMAIL.test(v)) errs.email = "Invalid email";
          else errs.email = "";
          break;
        case "aadhaar":
          errs.aadhaar = v ? (RE_AADHAAR.test(v) ? "" : "Invalid Aadhaar (12 digits, starts 2-9)") : "";
          break;
        case "pan":
          errs.pan = v ? (RE_PAN.test(v.toUpperCase()) ? "" : "Invalid PAN (e.g. ABCDE1234F)") : "";
          break;
        case "passport":
          errs.passport = v ? (RE_PASSPORT.test(v.toUpperCase()) ? "" : "Invalid passport (e.g. A1234567)") : "";
          break;
        case "drivingLicense":
          errs.drivingLicense = v ? (RE_DL.test(v.toUpperCase()) ? "" : "Invalid driving licence (common national format)") : "";
          break;
        case "voterId":
          errs.voterId = v ? (RE_VOTER.test(v.toUpperCase()) ? "" : "Invalid Voter ID (EPIC: AAA1234567)") : "";
          break;
        default:
          break;
      }
    };

    check("fullName", fullName);
    check("dob", dob);
    check("phone", phone);
    check("email", email);
    check("aadhaar", aadhaar);
    check("pan", pan);
    check("passport", passport);
    check("drivingLicense", drivingLicense);
    check("voterId", voterId);

    return errs;
  };

  // derive form validity without mutating state (safe in render)
  const isFormValid = useMemo(() => {
    const errs = getValidationErrors();
    const hasErrors = Object.values(errs).some((v) => v && v.length > 0);
    const requiredFilled = fullName.trim() !== "" && dob && phone && email && file;
    return requiredFilled && !hasErrors;
  }, [fullName, dob, phone, email, aadhaar, pan, passport, drivingLicense, voterId, file]);

  // ========== Upload (updated to avoid setState during render)
  const uploadDocument = async () => {
    // final validation before submit - compute pure errors
    const errs = getValidationErrors();
    const hasErrors = Object.values(errs).some((v) => v && v.length > 0);

    if (!file || hasErrors || !fullName.trim() || !dob || !phone || !email) {
      // push errors to UI for user to see (only update state here)
      setErrors(errs);
      alert("Please fill required fields and fix highlighted errors before uploading.");
      return;
    }

    const hash = await getFileHash(file);
    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      setStatus("⏳ Uploading to blockchain...");
      const tx = await contract.addDocumentHash(
        hash,
        fullName,
        dob,
        gender,
        physicalAddress,
        phone,
        email,
        aadhaar,
        pan,
        passport,
        drivingLicense,
        voterId
      );
      await tx.wait();
      setStatus("✅ Certificate added to blockchain.");
      setQrHash(hash);

      // Save to recent uploads (keep max 5)
      const newEntry = { hash, name: fullName || "Unnamed", time: new Date().toISOString() };
      const updated = [newEntry, ...recentUploads].slice(0, 5);
      setRecentUploads(updated);
      localStorage.setItem("recentUploads", JSON.stringify(updated));

      // Start superb loader, then show modal (2.5s)
      setModalHash(hash);
      setModalLoading(true);
      setShowModal(false);
      setTimeout(() => {
        setModalLoading(false);
        setShowModal(true);
      }, 2500);
    } catch (err) {
      setStatus("❌ Error adding certificate.");
      setQrHash("");
      console.error(err);
    }
  };

  // ---------- small UI helpers
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("");
      setQrHash("");
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch (e) {
      console.error("Copy failed", e);
      alert("Copy failed - please select and copy manually");
    }
  };

  const openModalWithHash = (hash) => {
    setModalHash(hash);
    setModalLoading(true);
    setShowModal(false);
    setTimeout(() => {
      setModalLoading(false);
      setShowModal(true);
    }, 2500);
  };

  const fmt = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  // helper to uppercase certain fields while typing
  const onChangeUpper = (setter) => (e) => {
    setter(e.target.value.toUpperCase());
  };

  const formatAadhaarDisplay = (s) => {
    if (!s) return "";
    const digits = s.replace(/\s+/g, "");
    if (digits.length !== 12) return s;
    return `${digits.slice(0,4)} ${digits.slice(4,8)} ${digits.slice(8,12)}`;
  };

  // ======== Styles + superb loader CSS
  const container = { display: "flex", justifyContent: "center", padding: 36, background: "linear-gradient(180deg,#f5f7fb 0%, #ffffff 100%)", minHeight: "calc(100vh - 40px)" };
  const card = { width: "100%", maxWidth: 1100, display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, background: "#ffffff", padding: 28, borderRadius: 12, boxShadow: "0 10px 30px rgba(16,24,40,0.08)" };
  const sectionTitle = { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 };
  const hint = { fontSize: 13, color: "#64748b", marginBottom: 18 };
  const fieldRow = { display: "flex", gap: 12, marginBottom: 12, alignItems: "center" };
  const label = { width: 140, fontWeight: 600, color: "#0f172a" };
  const inputBase = { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e6e9ef", outline: "none", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" };
  const inputFocus = { borderColor: "#60a5fa", boxShadow: "0 2px 8px rgba(96,165,250,0.08)" };
  const inputInvalid = { borderColor: "crimson", boxShadow: "0 2px 8px rgba(220,38,38,0.06)" };
  const uploadBtn = { width: "100%", padding: "12px 14px", background: "linear-gradient(90deg,#2563eb,#4f46e5)", color: "#fff", fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 8px 20px rgba(37,99,235,0.16)" };
  const smallMuted = { fontSize: 13, color: "#475569" };

  const overlayStyle = { position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
  const modalBase = { width: 420, maxWidth: "92%", background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 12px 40px rgba(2,6,23,0.3)", position: "relative" };
  const closeButton = { position: "absolute", top: 8, right: 12, background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#475569" };

  return (
    <div style={container}>
      <style>{`
        .loader-wrap { display:flex; align-items:center; justify-content:center; padding:26px; }
        .ring {
          width:120px; height:120px; border-radius:999px; position:relative; display:inline-block;
          background: conic-gradient(from 0deg, #2563eb, #7c3aed, #06b6d4, #2563eb);
          -webkit-mask: radial-gradient(circle 44px at center, transparent 45px, #000 46px);
          mask: radial-gradient(circle 44px at center, transparent 45px, #000 46px);
          animation: spin 1.8s linear infinite;
          box-shadow: 0 8px 30px rgba(37,99,235,0.14);
        }
        .inner-dot {
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:40px; height:40px; border-radius:50%;
          background:linear-gradient(180deg,#fff 0%, #f3f4f6 100%); box-shadow: inset 0 -4px 12px rgba(0,0,0,0.06);
          animation: pulse 1.6s ease-in-out infinite;
        }
        .loader-text { margin-top:12px; text-align:center; color:#e6eefc; font-weight:700; letter-spacing:0.4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(0.92); } 100% { transform: translate(-50%,-50%) scale(1); } }
      `}</style>

      <div style={card}>
        {/* LEFT: form */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <div style={sectionTitle}>Add KYC & Certificate</div>
            <div style={hint}>Enter identity details and upload a certificate. After upload a short loading animation appears before showing the QR.</div>
          </div>

          {/* Personal info */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...sectionTitle, fontSize: 14 }}>Personal Information</div>

            <div style={fieldRow}>
              <div style={label}>Full Name</div>
              <input
                style={{ ...(focusField === "fullName" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.fullName ? inputInvalid : {}) }}
                value={fullName}
                onFocus={() => setFocusField("fullName")}
                onBlur={() => validateField("fullName", fullName)}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As printed on ID"
              />
            </div>

            <div style={fieldRow}>
              <div style={label}>Date of Birth</div>
              <input
                type="date"
                style={{ ...(focusField === "dob" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.dob ? inputInvalid : {}) }}
                value={dob}
                onFocus={() => setFocusField("dob")}
                onBlur={() => validateField("dob", dob)}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            <div style={fieldRow}>
              <div style={label}>Gender</div>
              <select
                style={{ ...(focusField === "gender" ? { ...inputBase, ...inputFocus } : inputBase) }}
                value={gender}
                onFocus={() => setFocusField("gender")}
                onBlur={() => setFocusField(null)}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div style={fieldRow}>
              <div style={label}>Address</div>
              <textarea
                style={{ ...(focusField === "address" ? { ...inputBase, ...inputFocus } : inputBase), minHeight: 78, resize: "vertical" }}
                value={physicalAddress}
                onFocus={() => setFocusField("address")}
                onBlur={() => setFocusField(null)}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder="Full postal address"
              />
            </div>
          </div>

          {/* Contact & Documents */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...sectionTitle, fontSize: 14 }}>Contact & Documents</div>

            <div style={fieldRow}>
              <div style={label}>Phone</div>
              <input
                type="tel"
                style={{ ...(focusField === "phone" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.phone ? inputInvalid : {}) }}
                value={phone}
                onFocus={() => setFocusField("phone")}
                onBlur={() => validateField("phone", phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile (e.g. 9876543210)"
              />
            </div>
            {errors.phone && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.phone}</div>}

            <div style={fieldRow}>
              <div style={label}>Email</div>
              <input
                type="email"
                style={{ ...(focusField === "email" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.email ? inputInvalid : {}) }}
                value={email}
                onFocus={() => setFocusField("email")}
                onBlur={() => validateField("email", email)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.email}</div>}

            <div style={fieldRow}>
              <div style={label}>Aadhaar</div>
              <input
                style={{ ...(focusField === "aadhaar" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.aadhaar ? inputInvalid : {}) }}
                value={aadhaar}
                onFocus={() => setFocusField("aadhaar")}
                onBlur={() => validateField("aadhaar", aadhaar)}
                onChange={(e) => setAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="1234 5678 9012"
              />
            </div>
            {errors.aadhaar && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.aadhaar}</div>}

            <div style={fieldRow}>
              <div style={label}>PAN</div>
              <input
                style={{ ...(focusField === "pan" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.pan ? inputInvalid : {}) }}
                value={pan}
                onFocus={() => setFocusField("pan")}
                onBlur={() => validateField("pan", pan)}
                onChange={onChangeUpper(setPan)}
                placeholder="ABCDE1234F"
              />
            </div>
            {errors.pan && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.pan}</div>}

            <div style={fieldRow}>
              <div style={label}>Passport</div>
              <input
                style={{ ...(focusField === "passport" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.passport ? inputInvalid : {}) }}
                value={passport}
                onFocus={() => setFocusField("passport")}
                onBlur={() => validateField("passport", passport)}
                onChange={onChangeUpper(setPassport)}
                placeholder="A1234567"
              />
            </div>
            {errors.passport && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.passport}</div>}

            <div style={fieldRow}>
              <div style={label}>Driving License</div>
              <input
                style={{ ...(focusField === "drivingLicense" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.drivingLicense ? inputInvalid : {}) }}
                value={drivingLicense}
                onFocus={() => setFocusField("drivingLicense")}
                onBlur={() => validateField("drivingLicense", drivingLicense)}
                onChange={onChangeUpper(setDrivingLicense)}
                placeholder="StateRTOYearSerial (common formats accepted)"
              />
            </div>
            {errors.drivingLicense && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.drivingLicense}</div>}

            <div style={fieldRow}>
              <div style={label}>Voter ID</div>
              <input
                style={{ ...(focusField === "voterId" ? { ...inputBase, ...inputFocus } : inputBase), ...(errors.voterId ? inputInvalid : {}) }}
                value={voterId}
                onFocus={() => setFocusField("voterId")}
                onBlur={() => validateField("voterId", voterId)}
                onChange={onChangeUpper(setVoterId)}
                placeholder="ABC1234567 (EPIC)"
              />
            </div>
            {errors.voterId && <div style={{ color: "crimson", fontSize: 12, marginBottom: 8 }}>{errors.voterId}</div>}

            <div style={{ ...fieldRow, marginTop: 10 }}>
              <div style={label}>Upload File</div>
              <div>
                <input type="file" onChange={onFileChange} />
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Accepted: PDF, PNG, JPG — file content is hashed locally, not uploaded.</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              onClick={uploadDocument}
              style={{ ...uploadBtn, opacity: isFormValid ? 1 : 0.6, pointerEvents: isFormValid ? "auto" : "none" }}
              title={isFormValid ? "Upload to blockchain" : "Fix errors and fill required fields first"}
            >
              🚀 Upload to Blockchain
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#475569" }}>
            <strong>Status:</strong> {status || "Ready"}
          </div>
        </div>

        {/* RIGHT: Recent uploads list (REPLACED live preview) */}
        <div>
          <div style={{ background: "#fbfdff", borderRadius: 12, padding: 14, boxShadow: "0 6px 18px rgba(12,18,44,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Recent Uploads</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{recentUploads.length} stored</div>
            </div>

            {recentUploads.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8", padding: "28px 6px", textAlign: "center" }}>No uploads yet — after uploading the loader and QR appear automatically.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentUploads.map((r) => (
                  <div key={r.hash} className="recent-item" style={{ padding: 8, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ overflow: "hidden", maxWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{fmt(r.time)}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 6, wordBreak: "break-all" }}>{r.hash.slice(0, 10)}...{r.hash.slice(-6)}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button style={{ cursor: "pointer", padding: "6px 8px", borderRadius: 6, border: "1px solid #e6e9ef", background: "#fff" }} onClick={() => copyToClipboard(r.hash)}>Copy</button>
                      <button style={{ cursor: "pointer", padding: "6px 8px", borderRadius: 6, border: "1px solid #e6e9ef", background: "#fff" }} onClick={() => openModalWithHash(r.hash)}>Show QR</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Local list (browser storage)</div>
              <div>
                <button
                  onClick={() => { setRecentUploads([]); localStorage.removeItem("recentUploads"); }}
                  style={{ background: "transparent", border: "1px solid #eef2ff", padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
            Made with ❤️ • Local Hardhat
          </div>
        </div>
      </div>

      {/* Loader-only modal while modalLoading true */}
      {modalLoading && (
        <div style={overlayStyle}>
          <div style={{ ...modalBase, width: 260, textAlign: "center" }} role="status" aria-live="polite">
            <div className="loader-wrap">
              <div className="ring">
                <div className="inner-dot" />
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e6eefc" }}>Preparing your secure QR...</div>
            <div style={{ fontSize: 12, color: "#cfe7ff", marginTop: 8 }}>This won't take long — hashing & storing on-chain complete.</div>
          </div>
        </div>
      )}

      {/* Modal popup for QR (animated after loading) */}
      {showModal && !modalLoading && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div role="dialog" aria-modal="true" style={modalBase} onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close" style={closeButton} onClick={() => setShowModal(false)}>&times;</button>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Certificate QR</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Scan to open verify page or use the buttons below</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 8 }}>
              <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
                <QRCodeCanvas value={`http://localhost:3000/verify?hash=${modalHash}`} size={200} includeMargin />
              </div>

              <div style={{ fontSize: 12, color: "#0f172a", wordBreak: "break-all", maxWidth: "100%" }}>{modalHash}</div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => copyToClipboard(modalHash)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6e9ef", cursor: "pointer" }}>Copy Hash</button>
                <button onClick={() => window.open(`/verify?hash=${modalHash}`, "_blank")} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>Open Verify Page</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddPage;

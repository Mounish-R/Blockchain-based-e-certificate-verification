// CMD: Imports (unchanged)
import React, { useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const hardhatChainId = "0x7A69";

// CMD: Redesigned AddPage Component
function AddPage() {
  // CMD: States (UNCHANGED)
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [qrHash, setQrHash] = useState("");

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

  const [focusField, setFocusField] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalHash, setModalHash] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const [recentUploads, setRecentUploads] = useState([]);
  const [errors, setErrors] = useState({});

  // CMD: Load recent uploads
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentUploads");
      if (raw) setRecentUploads(JSON.parse(raw));
    } catch {}
  }, []);

  // CMD: Helper Functions (UNCHANGED)
  const switchToLocalhost = async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hardhatChainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hardhatChainId,
              chainName: "Hardhat Localhost",
              rpcUrls: ["http://127.0.0.1:8545"],
            },
          ],
        });
        return true;
      }
      return false;
    }
  };

  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return (
      "0x" +
      Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  };

  const getSigner = async () => {
    if (!window.ethereum) return null;
    const ok = await switchToLocalhost();
    if (!ok) return null;
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  // CMD: Validation (UNCHANGED)
  const RE_AADHAAR = /^[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/;
  const RE_PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const RE_PASSPORT = /^[A-Z][0-9]{7}$/;
  const RE_DL = /^[A-Z]{2}[-\s]?[0-9]{2}[-\s]?(?:19|20)[0-9]{2}[-\s]?[0-9]{7}$/;
  const RE_VOTER = /^[A-Z]{3}[0-9]{7}$/;
  const RE_PHONE = /^[6-9][0-9]{9}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name, val) => {
    let err = "";
    const v = (val || "").trim();
    switch (name) {
      case "fullName":
        if (!v) err = "Full name required";
        break;
      case "dob":
        if (!v) err = "Date of birth required";
        break;
      case "phone":
        if (!v) err = "Phone required";
        else if (!RE_PHONE.test(v)) err = "Invalid phone";
        break;
      case "email":
        if (!v) err = "Email required";
        else if (!RE_EMAIL.test(v)) err = "Invalid email";
        break;
      case "aadhaar":
        if (v && !RE_AADHAAR.test(v)) err = "Invalid Aadhaar";
        break;
      case "pan":
        if (v && !RE_PAN.test(v.toUpperCase())) err = "Invalid PAN";
        break;
      case "passport":
        if (v && !RE_PASSPORT.test(v.toUpperCase())) err = "Invalid passport";
        break;
      case "drivingLicense":
        if (v && !RE_DL.test(v.toUpperCase())) err = "Invalid DL";
        break;
      case "voterId":
        if (v && !RE_VOTER.test(v.toUpperCase())) err = "Invalid voter ID";
        break;
    }
    setErrors((p) => ({ ...p, [name]: err }));
  };

  const getValidationErrors = () => {
    const e = {};
    const check = (n, v) => validateField(n, v);
    check("fullName", fullName);
    check("dob", dob);
    check("phone", phone);
    check("email", email);
    check("aadhaar", aadhaar);
    check("pan", pan);
    check("passport", passport);
    check("drivingLicense", drivingLicense);
    check("voterId", voterId);
    return errors;
  };

  // CMD: Form Validity
  const isFormValid = useMemo(() => {
    return (
      fullName &&
      dob &&
      phone &&
      email &&
      file &&
      Object.values(errors).every((e) => !e)
    );
  }, [fullName, dob, phone, email, file, errors]);

  // CMD: Upload Document (UNCHANGED)
  const uploadDocument = async () => {
    const errs = getValidationErrors();
    if (!file || Object.values(errs).some((e) => e)) {
      alert("Fix errors before uploading");
      return;
    }

    const hash = await getFileHash(file);
    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(
      contractAddress,
      DocVerify.abi,
      signer
    );

    try {
      setStatus("Uploading...");
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
      setStatus("Uploaded successfully");
      setQrHash(hash);

      const entry = {
        hash,
        name: fullName,
        time: new Date().toISOString(),
      };
      const updated = [entry, ...recentUploads].slice(0, 5);
      setRecentUploads(updated);
      localStorage.setItem("recentUploads", JSON.stringify(updated));

      setModalHash(hash);
      setModalLoading(true);
      setTimeout(() => {
        setModalLoading(false);
        setShowModal(true);
      }, 2300);
    } catch {
      setStatus("Error uploading");
    }
  };

  // CMD: UI STYLING (THEME)
  const ui = {
    page: {
      padding: "40px",
      background: "#f5f7fa",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
    },
    layout: {
      maxWidth: "1250px",
      margin: "auto",
      display: "grid",
      gridTemplateColumns: "1fr 350px",
      gap: "30px",
    },
    card: {
      background: "#fff",
      borderRadius: "14px",
      padding: "28px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    },
    heading: {
      fontSize: "20px",
      fontWeight: "700",
      marginBottom: "10px",
      color: "#1e293b",
    },
    sub: {
      fontSize: "14px",
      color: "#64748b",
      marginBottom: "20px",
    },
    label: {
      fontWeight: "600",
      color: "#0f172a",
      marginBottom: "6px",
      fontSize: "14px",
    },
    input: (error, focus) => ({
      width: "100%",
      padding: "10px 14px",
      borderRadius: "10px",
      border: error
        ? "1px solid #dc2626"
        : focus
        ? "1px solid #2563eb"
        : "1px solid #dce3ed",
      outline: "none",
      boxShadow: focus ? "0 0 0 3px rgba(37,99,235,0.2)" : "none",
      fontSize: "14px",
    }),
    button: {
      width: "100%",
      marginTop: "20px",
      padding: "12px",
      fontSize: "15px",
      background: "linear-gradient(90deg,#2563eb,#4f46e5)",
      color: "#fff",
      fontWeight: "700",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      boxShadow: "0 4px 14px rgba(37,99,235,0.25)",
    },
  };

  // CMD: UI RENDER (REDESIGNED)
  return (
    <div style={ui.page}>
      <div style={ui.layout}>
        {/* LEFT CARD */}
        <div style={ui.card}>
          <div style={ui.heading}>Add KYC & Certificate</div>
          <div style={ui.sub}>
            Fill identity details and upload certificate. A secure QR will be
            generated automatically.
          </div>

          {/* FULL NAME */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Full Name</div>
            <input
              style={ui.input(errors.fullName, focusField === "fullName")}
              value={fullName}
              onFocus={() => setFocusField("fullName")}
              onBlur={() => validateField("fullName", fullName)}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full legal name"
            />
            {errors.fullName && (
              <div style={{ color: "crimson", fontSize: 12 }}>
                {errors.fullName}
              </div>
            )}
          </div>

          {/* DOB */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Date of Birth</div>
            <input
              type="date"
              style={ui.input(errors.dob, focusField === "dob")}
              value={dob}
              onFocus={() => setFocusField("dob")}
              onBlur={() => validateField("dob", dob)}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          {/* GENDER */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Gender</div>
            <select
              style={ui.input(false, focusField === "gender")}
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

          {/* ADDRESS */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Address</div>
            <textarea
              style={ui.input(false, focusField === "address")}
              value={physicalAddress}
              onFocus={() => setFocusField("address")}
              onBlur={() => setFocusField(null)}
              onChange={(e) => setPhysicalAddress(e.target.value)}
              placeholder="Full postal address"
              rows="3"
            />
          </div>

          {/* PHONE */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Phone</div>
            <input
              style={ui.input(errors.phone, focusField === "phone")}
              value={phone}
              onFocus={() => setFocusField("phone")}
              onBlur={() => validateField("phone", phone)}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
            />
            {errors.phone && (
              <div style={{ color: "crimson", fontSize: 12 }}>
                {errors.phone}
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Email</div>
            <input
              style={ui.input(errors.email, focusField === "email")}
              value={email}
              onFocus={() => setFocusField("email")}
              onBlur={() => validateField("email", email)}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* DOCUMENT FIELDS — Aadhaar, PAN, Passport, etc */}
          {[
            ["Aadhaar", aadhaar, setAadhaar, "aadhaar"],
            ["PAN", pan, setPan, "pan"],
            ["Passport", passport, setPassport, "passport"],
            ["Driving License", drivingLicense, setDrivingLicense, "drivingLicense"],
            ["Voter ID", voterId, setVoterId, "voterId"],
          ].map(([label, value, setter, key]) => (
            <div style={{ marginBottom: "18px" }} key={key}>
              <div style={ui.label}>{label}</div>
              <input
                style={ui.input(errors[key], focusField === key)}
                value={value}
                onFocus={() => setFocusField(key)}
                onBlur={() => validateField(key, value)}
                onChange={(e) => setter(e.target.value)}
                placeholder={`Enter ${label}`}
              />
              {errors[key] && (
                <div style={{ color: "crimson", fontSize: 12 }}>
                  {errors[key]}
                </div>
              )}
            </div>
          ))}

          {/* FILE UPLOAD */}
          <div style={{ marginBottom: "18px" }}>
            <div style={ui.label}>Upload Certificate File</div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            style={{
              ...ui.button,
              opacity: isFormValid ? 1 : 0.6,
              cursor: isFormValid ? "pointer" : "not-allowed",
            }}
            onClick={uploadDocument}
          >
            Upload to Blockchain
          </button>

          <div style={{ marginTop: 12, color: "#475569", fontSize: 14 }}>
            <strong>Status:</strong> {status || "Ready"}
          </div>
        </div>

        {/* RIGHT SIDE — Recent Uploads */}
        <div style={ui.card}>
          <div style={ui.heading}>Recent Uploads</div>

          {recentUploads.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No uploads yet.</div>
          ) : (
            recentUploads.map((item) => (
              <div
                key={item.hash}
                style={{
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {new Date(item.time).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>
                    {item.hash}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalHash(item.hash);
                    setModalLoading(true);
                    setTimeout(() => {
                      setModalLoading(false);
                      setShowModal(true);
                    }, 2000);
                  }}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #d1d9e6",
                    borderRadius: "10px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LOADING MODAL */}
      {modalLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "14px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
              textAlign: "center",
              width: "260px",
            }}
          >
            <div className="loader-ring"></div>
            <div style={{ marginTop: 12, fontWeight: 700 }}>Preparing QR...</div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showModal && !modalLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "28px",
              borderRadius: "16px",
              width: "360px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 10 }}>
              Certificate QR
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <QRCodeCanvas value={`http://localhost:3000/verify?hash=${modalHash}`} size={200} />
            </div>

            <div style={{ wordBreak: "break-all", fontSize: 12 }}>{modalHash}</div>

            <button
              onClick={() => window.open(`/verify?hash=${modalHash}`, "_blank")}
              style={{
                ...ui.button,
                marginTop: 18,
                padding: "8px",
                fontSize: "14px",
                borderRadius: "10px",
              }}
            >
              Open Verification Page
            </button>

            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px",
                background: "#e2e8f0",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddPage;

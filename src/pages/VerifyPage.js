// CMD: Imports (NO CHANGE)
import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function VerifyPage() {
  // CMD: STATES
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);

  const [manualHashes, setManualHashes] = useState("");
  const [multiResults, setMultiResults] = useState([]);

  const [excelData, setExcelData] = useState([]);
  const [excelResults, setExcelResults] = useState([]);

  const certificateRef = useRef();
  const query = new URLSearchParams(useLocation().search);
  const hashFromQR = query.get("hash");

  // CMD: CLEAN HASH
  const cleanHash = (h) => {
    if (!h) return "";
    h = String(h).trim();

    if (!h.startsWith("0x") && h.length === 64 && /^[0-9a-fA-F]+$/.test(h)) {
      return "0x" + h;
    }
    if (h.toLowerCase().includes("e")) {
      try {
        const big = window.BigInt(h);
        return "0x" + big.toString(16).padStart(64, "0");
      } catch {}
    }
    return h;
  };

  // CMD: FILE HASH
  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "0x" + hex;
  };

  // CMD: SIGNER
  const getSigner = async () => {
    if (!window.ethereum) return null;

    await window.ethereum.request({ method: "eth_requestAccounts" });

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7A69" }],
      });
    } catch {}

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  // CMD: VERIFY HASH
  const verifyHash = async (hash) => {
    setExcelResults([]);
    setMultiResults([]);

    if (!hash) return setStatus("❌ No hash provided");

    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      setLoading(true);
      setStatus("⏳ Verifying...");

      const isValid = await contract.verifyDocument(hash);

      if (isValid) {
        const data = await contract.getStudentDetails(hash);

        setStudent({
          hash,
          fullName: data[0],
          dob: data[1],
          gender: data[2],
          physicalAddress: data[3],
          phone: data[4],
          email: data[5],
          aadhaar: data[6],
          pan: data[7],
          passport: data[8],
          drivingLicense: data[9],
          voterId: data[10],
          verifiedAt: new Date().toISOString(),
        });

        setStatus("✅ Certificate is VALID");
      } else {
        setStudent(null);
        setStatus("❌ INVALID hash");
      }
    } catch {
      setStatus("❌ Verification error");
    } finally {
      setLoading(false);
    }
  };

  // CMD: MULTI VERIFY
  const handleMultiHashVerify = async () => {
    setStudent(null);
    setExcelResults([]);

    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    const hashes = manualHashes
      .split(/[\s,]+/)
      .map(cleanHash)
      .filter((h) => h);

    let results = [];

    for (let h of hashes) {
      if (!h.startsWith("0x") || h.length !== 66) {
        results.push({ hash: h, valid: false });
        continue;
      }

      try {
        const valid = await contract.verifyDocument(h);
        results.push({ hash: h, valid });
      } catch {
        results.push({ hash: h, valid: false });
      }
    }

    setMultiResults(results);
    setStatus(results.every((r) => r.valid) ? "✅ All Valid" : "⚠ Some Invalid");
  };

  // CMD: EXCEL UPLOAD
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const wb = XLSX.read(event.target.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const rows = json.slice(1).map((r) => ({
        name: r[0],
        hash: cleanHash(r[1]),
      }));
      setExcelData(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  // CMD: VERIFY EXCEL
  const verifyExcelHashes = async () => {
    setStudent(null);
    setMultiResults([]);

    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    let results = [];

    for (let row of excelData) {
      const { name, hash } = row;

      if (!hash.startsWith("0x") || hash.length !== 66) {
        results.push({ name, hash, valid: false });
        continue;
      }

      try {
        const valid = await contract.verifyDocument(hash);
        results.push({ name, hash, valid });
      } catch {
        results.push({ name, hash, valid: false });
      }
    }

    setExcelResults(results);
    setStatus(results.every((r) => r.valid) ? "✅ All Excel Valid" : "⚠ Some Excel Invalid");
  };

  // CMD: FILE VERIFY
  const handleManualVerify = async () => {
    if (!file) return alert("Select a file first");
    const hash = await getFileHash(file);
    verifyHash(hash);
  };

  // CMD: AUTO VERIFY FROM QR
  useEffect(() => {
    if (hashFromQR) verifyHash(hashFromQR);
  }, [hashFromQR]);

  // CMD: EXPORT PDF FUNCTION
  const exportPDF = async () => {
    if (!student) return alert("No verified certificate!");

    try {
      const element = certificateRef.current;

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);

      pdf.save(`Verified-Certificate-${student.fullName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed");
    }
  };

  // CMD: UI
  const ui = {
    page: {
      padding: "40px",
      minHeight: "100vh",
      background: "#f5f7fa",
      fontFamily: "Inter, sans-serif",
    },
    section: {
      background: "#fff",
      padding: "24px",
      borderRadius: "14px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      marginBottom: "24px",
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
      marginBottom: "16px",
    },
    input: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid #d4dce6",
      fontSize: "14px",
    },
    button: {
      padding: "12px 16px",
      marginTop: "12px",
      background: "linear-gradient(90deg,#2563eb,#4f46e5)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "700",
      boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
    },
  };

  return (
    <div style={ui.page}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>🔍 Verify Certificate</h1>
      <p style={{ textAlign: "center", fontSize: 16 }}>{loading ? "⏳ Checking..." : status}</p>

      {/* SECTION 1: FILE VERIFY */}
      <div style={ui.section}>
        <div style={ui.heading}>📄 Verify Using File</div>
        <div style={ui.sub}>Upload the original file for verification.</div>

        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => {
            const f = e.target.files[0];
            setFile(f);
            setFileURL(URL.createObjectURL(f));
          }}
          style={ui.input}
        />

        <button style={ui.button} onClick={handleManualVerify}>
          Verify File
        </button>
      </div>

      {/* SECTION 2: MULTI HASH */}
      <div style={ui.section}>
        <div style={ui.heading}>🔗 Verify Multiple Hashes</div>
        <div style={ui.sub}>Enter multiple hashes separated by space or comma.</div>

        <textarea
          rows={4}
          style={{ ...ui.input, height: "110px" }}
          placeholder="Hash1 Hash2 Hash3..."
          value={manualHashes}
          onChange={(e) => setManualHashes(e.target.value)}
        ></textarea>

        <button style={ui.button} onClick={handleMultiHashVerify}>
          Verify All
        </button>

        {multiResults.length > 0 && (
          <div style={{ marginTop: 15 }}>
            {multiResults.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  background: r.valid ? "#eaffea" : "#ffeaea",
                  marginBottom: "6px",
                }}
              >
                {r.valid ? `✔ VALID → ${r.hash}` : `❌ INVALID → ${r.hash}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: EXCEL VERIFY */}
      <div style={ui.section}>
        <div style={ui.heading}>🏢 Organization Mode — Excel Verification</div>
        <div style={ui.sub}>Upload Excel with Name and Hash columns.</div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelUpload}
          style={ui.input}
        />

        <button style={ui.button} onClick={verifyExcelHashes}>
          Verify Excel
        </button>

        {excelResults.length > 0 && (
          <div style={{ marginTop: 20 }}>
            {excelResults.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  background: r.valid ? "#eaffea" : "#ffeaea",
                  marginBottom: "8px",
                }}
              >
                {r.valid
                  ? `✔ ${r.name} → VALID`
                  : `❌ ${r.name} → INVALID`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: VERIFIED CERTIFICATE */}
      {student && (
        <div style={ui.section} ref={certificateRef}>
          <div style={ui.heading}>🎉 Verified Certificate</div>

          <div style={{ padding: "10px 4px" }}>
            {Object.entries(student).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <strong style={{ textTransform: "capitalize" }}>{k}:</strong>
                <br />
                {String(v)}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <QRCodeCanvas value={student.hash} size={180} />
          </div>

          <div style={{ textAlign: "center", marginTop: 25 }}>
            <button
              onClick={exportPDF}
              style={{
                padding: "12px 18px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

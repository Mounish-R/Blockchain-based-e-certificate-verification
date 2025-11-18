import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function VerifyPage() {
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [manualHash, setManualHash] = useState("");
  const certificateRef = useRef();

  const query = new URLSearchParams(useLocation().search);
  const hashFromQR = query.get("hash");

  // Helpers (unchanged blockchain-related)
  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + hashHex;
  };

  const getSigner = async () => {
    if (!window.ethereum) {
      alert("MetaMask required");
      return null;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x7A69" }] });
    } catch (e) {
      /* ignore */
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  const verifyHash = async (hash) => {
    if (!hash) {
      setStatus("❌ No hash provided.");
      return;
    }
    const signer = await getSigner();
    if (!signer) return;
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      setLoading(true);
      setStatus("⏳ Verifying on blockchain...");
      const isValid = await contract.verifyDocument(hash);
      if (isValid) {
        const studentData = await contract.getStudentDetails(hash);
        // attach a verifiedAt timestamp (client time). Safe fallback if missing.
        const verifiedAt = new Date().toISOString();
        setStudent({
          hash,
          // Map contract return values (expected order must match your contract)
          fullName: studentData[0] || "",
          dob: studentData[1] || "",
          gender: studentData[2] || "",
          physicalAddress: studentData[3] || "",
          phone: studentData[4] || "",
          email: studentData[5] || "",
          aadhaar: studentData[6] || "",
          pan: studentData[7] || "",
          passport: studentData[8] || "",
          drivingLicense: studentData[9] || "",
          voterId: studentData[10] || "",
          // extra (if you store a 'degree' or others adjust accordingly)
          verifiedAt,
        });
        setStatus("✅ Certificate is VALID.");
      } else {
        setStatus("❌ Certificate is INVALID.");
        setStudent(null);
      }
    } catch (err) {
      setStatus("❌ Error verifying certificate.");
      setStudent(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!file) return alert("Select a file first");
    const hash = await getFileHash(file);
    verifyHash(hash);
  };

  const handleHashVerify = () => {
    if (!manualHash.startsWith("0x") || manualHash.length !== 66) {
      alert("Invalid hash format");
      return;
    }
    verifyHash(manualHash);
  };

  const downloadPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");

    if (file && file.type.startsWith("image/")) {
      const img = new Image();
      img.src = fileURL;
      await new Promise((resolve) => {
        img.onload = () => resolve();
      });
      const width = pdf.internal.pageSize.getWidth();
      const height = (img.height * width) / img.width;
      pdf.addImage(img, "JPEG", 0, 0, width, height);
    }

    const canvas = await html2canvas(certificateRef.current, { scale: 3, useCORS: true, logging: false });
    const certImg = canvas.toDataURL("image/png");
    pdf.addPage();
    const imgProps = pdf.getImageProperties(certImg);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(certImg, "PNG", 0, 0, pdfWidth, pdfHeight);

    pdf.save("verified-certificate.pdf");
  };

  useEffect(() => {
    if (hashFromQR) verifyHash(hashFromQR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashFromQR]);

  // Format helpers (defensive)
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const shortHash = (h) => (h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "—");

  // Styles: grid layout avoids overlap; QR column fixed width
  const page = { padding: 28, fontFamily: "Georgia, 'Times New Roman', serif", color: "#0b1220" };
  const header = { textAlign: "center", marginBottom: 12 };
  const layout = { display: "grid", gridTemplateColumns: "1fr 300px", gap: 22, justifyContent: "center" };
  const certificateWrapper = {
    width: "100%", maxWidth: 960, margin: "0 auto", padding: 18,
    background: "linear-gradient(180deg,#fffdf9 0%, #fffefc 100%)",
    borderRadius: 6, boxShadow: "0 10px 30px rgba(2,6,23,0.06)"
  };

  const outerBorder = { border: "7px solid #d8cdb3", borderRadius: 8, padding: 10, background: "#fbfaf5" };
  const innerBorder = { border: "3px solid #efe6d0", borderRadius: 6, padding: 20, minHeight: 520, position: "relative", overflow: "hidden" };

  const titleStyle = { fontSize: 20, fontWeight: 800, letterSpacing: 1.2, color: "#10233b" };
  const subtitleStyle = { fontSize: 12, color: "#51606a", marginTop: 6 };
  const nameStyle = { fontSize: 32, fontWeight: 800, color: "#0b1220", margin: "12px 0" };
  const degreeStyle = { fontSize: 16, color: "#20303f", marginBottom: 6 };
  const smallMuted = { fontSize: 12, color: "#4b5563" };

  const leftCol = { paddingRight: 6 };
  const rightCol = { paddingLeft: 6 };

  return (
    <div style={page}>
      <div style={header}>
        <h1 style={{ margin: 0 }}>🔍 Verify Certificate / KYC</h1>
        <div style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>{loading ? "⏳ Verifying..." : status}</div>
      </div>

      {/* Inputs */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {!hashFromQR && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ marginRight: 8 }}>📄 Verify using file:</label>
              <input type="file" accept=".pdf,image/*" onChange={(e) => {
                const uploadedFile = e.target.files[0];
                setFile(uploadedFile);
                setFileURL(URL.createObjectURL(uploadedFile));
                setStatus("");
                setStudent(null);
              }} />
              <button onClick={handleManualVerify} style={{ marginLeft: 8 }}>Verify File</button>
            </div>

            <div>
              <label style={{ marginRight: 8 }}>🔑 Verify using Blockchain Hash:</label>
              <input type="text" value={manualHash} onChange={(e) => { setManualHash(e.target.value); setStatus(""); setStudent(null); }} placeholder="Paste blockchain hash here" style={{ width: 360 }} />
              <button onClick={handleHashVerify} style={{ marginLeft: 8 }}>Verify Hash</button>
            </div>
          </>
        )}
      </div>

      {/* Main layout */}
      <div style={layout}>
        {/* Left: certificate area */}
        <div style={leftCol}>
          {fileURL && (
            <div style={{ marginBottom: 18, textAlign: "center" }}>
              {file?.type.startsWith("image/") ? (<img src={fileURL} alt="Uploaded" style={{ width: 300, border: "1px solid #ccc" }} />) : (<iframe src={fileURL} title="PDF Preview" width="500" height="500"></iframe>)}
            </div>
          )}

          {student && (
            <div ref={certificateRef} style={certificateWrapper}>
              <div style={outerBorder}>
                <div style={innerBorder}>
                  {/* header */}
                  <div style={{ textAlign: "center", paddingTop: 6 }}>
                    <div style={titleStyle}>Certificate of Verification</div>
                    <div style={subtitleStyle}>This document certifies that the following identity record has been verified on the blockchain.</div>
                  </div>

                  {/* body - use columns to avoid overlap */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>This is to certify that</div>
                      <div style={nameStyle}>{student.fullName || "—"}</div>

                      <div style={degreeStyle}>has successfully recorded their identity details</div>

                      {/* show all fields clearly */}
                      <div style={{ marginTop: 12, ...smallMuted, lineHeight: 1.6 }}>
                        <div><strong>Date of Birth:</strong> {student.dob || "—"}</div>
                        <div><strong>Gender:</strong> {student.gender || "—"}</div>
                        <div><strong>Address:</strong> {student.physicalAddress || "—"}</div>
                        <div><strong>Phone:</strong> {student.phone || "—"}</div>
                        <div><strong>Email:</strong> {student.email || "—"}</div>
                        <div><strong>Aadhaar:</strong> {student.aadhaar || "—"}</div>
                        <div><strong>PAN:</strong> {student.pan || "—"}</div>
                        <div><strong>Passport:</strong> {student.passport || "—"}</div>
                        <div><strong>Driving License:</strong> {student.drivingLicense || "—"}</div>
                        <div><strong>Voter ID:</strong> {student.voterId || "—"}</div>
                      </div>
                    </div>

                    {/* right side inside certificate: QR + compact fields */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ background: "#fff", padding: 12, borderRadius: 10, alignSelf: "center" }}>
                        <QRCodeCanvas value={`http://localhost:3000/verify?hash=${student.hash}`} size={150} includeMargin />
                      </div>

                      <div style={{ fontSize: 12, color: "#475569", wordBreak: "break-word" }}>{shortHash(student.hash)}</div>

                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        <div><strong>Certificate ID</strong></div>
                        <div style={{ fontFamily: "monospace", marginTop: 6 }}>{student.hash || "—"}</div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                        <div><strong>Digital verification</strong></div>
                        <div style={{ marginTop: 6 }}>{fmt(student.verifiedAt)}</div>
                      </div>
                    </div>
                  </div>

                  {/* signature line only (no words) */}
                  <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ borderTop: "2px solid #cfc0a7", width: 220, height: 0 }} />
                    <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280" }}>{/* empty signature area */}</div>
                  </div>

                  {/* footer */}
                  <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
                    <div>Issued by DocVerify • Secure blockchain-backed verification</div>
                    <div>Digitally signed on {fmt(student.verifiedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: compact action column (fixed width) */}
        <div style={rightCol}>
          <div style={{ background: "#fbfdff", borderRadius: 10, padding: 14, boxShadow: "0 8px 18px rgba(12,18,44,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Certificate Details</div>
            </div>

            <div style={{ fontSize: 13, color: "#475569", marginBottom: 10 }}>
              <div><strong>Status:</strong> {loading ? "Verifying..." : (status || "Ready")}</div>
              <div style={{ marginTop: 8 }}><strong>Hash:</strong><div style={{ wordBreak: "break-all", fontFamily: "monospace", marginTop: 6 }}>{student ? student.hash : "—"}</div></div>
              <div style={{ marginTop: 8 }}><strong>Verified:</strong> {student ? fmt(student.verifiedAt) : "—"}</div>
              <div style={{ marginTop: 8 }}><strong>Contact:</strong> support@docverify.local</div>
            </div>

            {student && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={downloadPDF} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>📥 Download</button>
                <button onClick={() => { if (!student || !student.hash) return; window.open(`/verify?hash=${student.hash}`, "_blank"); }} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e6e9ef", background: "#fff", cursor: "pointer" }}>Open</button>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
              Recent verification is stored only in your browser session.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

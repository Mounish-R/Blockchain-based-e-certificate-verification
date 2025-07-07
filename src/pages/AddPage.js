import React, { useState } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 🔁 Replace with deployed address

function AddPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [qrHash, setQrHash] = useState("");
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");

  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + hashHex;
  };

  const getSigner = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required");
      return null;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  const uploadDocument = async () => {
    if (!file || !name || !degree || !year) {
      return alert("Please fill in all fields and select a file");
    }

    const hash = await getFileHash(file);
    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const tx = await contract.addDocumentHash(hash, name, degree, year);
      await tx.wait();
      setStatus("✅ Certificate added to blockchain.");
      setQrHash(hash);
    } catch (err) {
      setStatus("❌ Error adding certificate.");
      setQrHash("");
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        backgroundColor: "#f9f9f9",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ textAlign: "center", color: "#333" }}>➕ Add Certificate</h1>
        <p style={{ textAlign: "center", color: "#555", marginBottom: "30px" }}>
          Fill in the student details and upload a certificate to record it on the blockchain.
        </p>

        {/* 🧾 Step 1: Enter Student Info */}
        <div style={{ marginBottom: "20px" }}>
          <label><strong>👤 Student Name:</strong></label><br />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label><strong>🎓 Degree:</strong></label><br />
          <input
            type="text"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label><strong>📅 Year:</strong></label><br />
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        {/* 📄 Step 2: Upload Certificate File */}
        <div style={{ marginBottom: "20px" }}>
          <label><strong>📁 Upload Certificate File:</strong></label><br />
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setStatus("");
              setQrHash("");
            }}
            style={{ marginTop: "8px" }}
          />
        </div>

        {/* ⬆️ Upload Button */}
        <button
          onClick={uploadDocument}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#4CAF50",
            color: "white",
            fontWeight: "bold",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          🚀 Upload to Blockchain
        </button>

        {/* ℹ️ Status Message */}
        {status && (
          <p style={{ marginTop: "20px", textAlign: "center", fontWeight: "bold", color: status.includes("✅") ? "green" : "red" }}>
            {status}
          </p>
        )}

        {/* ✅ Show QR on Success */}
        {qrHash && (
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <h3>🔗 QR Code (Scan to Verify)</h3>
            <QRCodeCanvas
              value={`http://localhost:3000/verify?hash=${qrHash}`}
              size={200}
              includeMargin
            />
            <p style={{ fontSize: "12px", wordBreak: "break-word", marginTop: "10px" }}>
              {qrHash}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddPage;

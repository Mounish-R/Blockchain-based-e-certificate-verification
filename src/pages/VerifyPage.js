import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Replace with your deployed contract address
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [student, setStudent] = useState(null);
  const [manualHash, setManualHash] = useState("");
  const certificateRef = useRef();

  const query = new URLSearchParams(useLocation().search);
  const hashFromQR = query.get("hash");

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

  const verifyHash = async (hash) => {
    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);
    try {
      const isValid = await contract.verifyDocument(hash);
      if (isValid) {
        const studentData = await contract.getStudentDetails(hash);
        setStudent({
          hash,
          name: studentData[0],
          degree: studentData[1],
          year: studentData[2],
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
    const input = certificateRef.current;
    const canvas = await html2canvas(input, {
      scale: 3, // High-res export
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("verified-certificate.pdf");
  };

  useEffect(() => {
    if (hashFromQR) {
      verifyHash(hashFromQR);
    }
  }, [hashFromQR]);

  return (
    <div className="page" style={{ padding: "40px" }}>
      <h1>🔍 Verify Certificate</h1>

      {hashFromQR ? (
        <>
          <p>Verifying via QR...</p>
          <p>Hash: {hashFromQR}</p>
        </>
      ) : (
        <>
          <div>
            <h4>📄 Verify using file:</h4>
            <input
              type="file"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setStatus("");
                setStudent(null);
              }}
            />
            <button onClick={handleManualVerify}>Verify File</button>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4>🔑 Verify using Blockchain Hash:</h4>
            <input
              type="text"
              value={manualHash}
              onChange={(e) => {
                setManualHash(e.target.value);
                setStatus("");
                setStudent(null);
              }}
              placeholder="Paste blockchain hash here"
              style={{ width: "350px" }}
            />
            <button onClick={handleHashVerify}>Verify Hash</button>
          </div>
        </>
      )}

      <p>{status}</p>

      {student && (
        <div>
          <div
            ref={certificateRef}
            style={{
              padding: "40px",
              border: "6px double #444",
              marginTop: 30,
              width: "500px",
              backgroundColor: "#fdfdfd",
              textAlign: "center",
              fontFamily: "'Georgia', serif",
              margin: "auto"
            }}
          >
            {/* Logo & Title */}
      
            <h2 style={{ marginBottom: "0", color: "#333" }}>Blockchain Certificate</h2>
            <p style={{ fontStyle: "italic", color: "#777" }}>Accredited Certificate of Achievement</p>

            <hr style={{ margin: "20px 0", borderColor: "#ccc" }} />

            {/* Body */}
            <h1 style={{ margin: "30px 0 10px", fontSize: "28px", color: "#222" }}>
              Verified Certificate
            </h1>
            <p>This is to certify that</p>
            <h2 style={{ margin: "10px 0", color: "#000" }}>{student.name}</h2>
            <p>
              has successfully completed the degree of <strong>{student.degree}</strong> <br />
              in the year <strong>{student.year}</strong>.
            </p>

            <hr style={{ margin: "30px 0", borderColor: "#ccc" }} />

            {/* Footer */}
            <p style={{ fontSize: "12px", color: "#555" }}>
              Blockchain Verification Hash:
              <br />
              <span style={{ wordBreak: "break-word", fontSize: "10px" }}>{student.hash}</span>
            </p>
            <QRCodeCanvas
              value={`http://localhost:3000/verify?hash=${student.hash}`}
              size={100}
              includeMargin
            />
            <p style={{ fontSize: "10px", marginTop: "5px" }}>Scan QR to verify</p>
          </div>

          <br />
          <div style={{ textAlign: "center" }}>
            <button
              onClick={downloadPDF}
              style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              📥 Download Verified Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyPage;

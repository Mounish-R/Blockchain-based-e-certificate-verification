import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // update after redeploy

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
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
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x7A69" }] });
    } catch (switchError) {
      console.error("Switch network error:", switchError);
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
      const isValid = await contract.verifyDocument(hash);
      if (isValid) {
        // The contract returns many strings in same order as struct
        const studentData = await contract.getStudentDetails(hash);
        setStudent({
          hash,
          fullName: studentData[0],
          dob: studentData[1],
          gender: studentData[2],
          physicalAddress: studentData[3],
          phone: studentData[4],
          email: studentData[5],
          aadhaar: studentData[6],
          pan: studentData[7],
          passport: studentData[8],
          drivingLicense: studentData[9],
          voterId: studentData[10],
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
      await new Promise((resolve) => { img.onload = () => resolve(); });
      const width = pdf.internal.pageSize.getWidth();
      const height = (img.height * width) / img.width;
      pdf.addImage(img, "JPEG", 0, 0, width, height);
    }

    const canvas = await html2canvas(certificateRef.current, { scale: 3, useCORS: true });
    const certImg = canvas.toDataURL("image/png");
    pdf.addPage();
    const imgProps = pdf.getImageProperties(certImg);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(certImg, "PNG", 0, 0, pdfWidth, pdfHeight);

    pdf.save("combined-certificate.pdf");
  };

  useEffect(() => {
    if (hashFromQR) {
      verifyHash(hashFromQR);
    }
  }, [hashFromQR]);

  return (
    <div className="page" style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔍 Verify Certificate / KYC</h1>

      {hashFromQR ? (
        <>
          <p>Verifying via QR...</p>
          <p>Hash: {hashFromQR}</p>
        </>
      ) : (
        <>
          <div>
            <h4>📄 Verify using file:</h4>
            <input type="file" accept=".pdf,image/*" onChange={(e)=>{ const uploadedFile = e.target.files[0]; setFile(uploadedFile); setFileURL(URL.createObjectURL(uploadedFile)); setStatus(""); setStudent(null); }} />
            <button onClick={handleManualVerify} style={{ marginLeft: "10px" }}>Verify File</button>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4>🔑 Verify using Blockchain Hash:</h4>
            <input type="text" value={manualHash} onChange={(e)=>{ setManualHash(e.target.value); setStatus(""); setStudent(null); }} placeholder="Paste blockchain hash here" style={{ width: "350px" }} />
            <button onClick={handleHashVerify} style={{ marginLeft: "10px" }}>Verify Hash</button>
          </div>
        </>
      )}

      <p style={{ fontWeight: "bold", marginTop: "20px" }}>{loading ? "⏳ Verifying..." : status}</p>

      {fileURL && (
        <div style={{ marginTop: 30 }}>
          <h3>📄 Uploaded Document Preview</h3>
          {file?.type.startsWith("image/") ? (
            <img src={fileURL} alt="Uploaded" style={{ width: "250px", border: "1px solid #ccc" }} />
          ) : (
            <iframe src={fileURL} title="PDF Preview" width="500" height="500"></iframe>
          )}
        </div>
      )}

      {student && (
        <div>
          <div ref={certificateRef} style={{ padding: "30px", border: "4px double #444", marginTop: 30, width: "700px", backgroundColor: "#fff", textAlign: "left", fontFamily: "'Georgia', serif", margin: "auto" }}>
            <h2 style={{ textAlign: "center" }}>Blockchain Verified Identity / Certificate</h2>
            <hr />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><strong>Full Name:</strong><div>{student.fullName}</div></div>
              <div><strong>DOB:</strong><div>{student.dob}</div></div>
              <div><strong>Gender:</strong><div>{student.gender}</div></div>
              <div><strong>Phone:</strong><div>{student.phone}</div></div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Address:</strong><div>{student.physicalAddress}</div></div>
              <div><strong>Email:</strong><div>{student.email}</div></div>
              <div><strong>Aadhaar:</strong><div>{student.aadhaar}</div></div>
              <div><strong>PAN:</strong><div>{student.pan}</div></div>
              <div><strong>Passport:</strong><div>{student.passport}</div></div>
              <div><strong>Driving License:</strong><div>{student.drivingLicense}</div></div>
              <div><strong>Voter ID:</strong><div>{student.voterId}</div></div>
            </div>

            <hr style={{ marginTop: 16 }} />

            <div style={{ textAlign: "center", marginTop: 10 }}>
              <p style={{ fontSize: 12 }}>Blockchain Verification Hash:</p>
              <p style={{ wordBreak: "break-word", fontSize: 10 }}>{student.hash}</p>
              <QRCodeCanvas value={`http://localhost:3000/verify?hash=${student.hash}`} size={100} includeMargin />
              <p style={{ fontSize: 10 }}>Scan QR to verify</p>
            </div>
          </div>

          <br />
          <div>
            <button onClick={downloadPDF} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              📥 Download Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyPage;

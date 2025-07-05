import React, { useState } from "react";
import { ethers } from "ethers";
import DocVerify from "./contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";

const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

function App() {
  const [uploadFile, setUploadFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("");
  const [qrHash, setQrHash] = useState("");

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
    if (!uploadFile) return alert("Please select a file to upload.");
    const hash = await getFileHash(uploadFile);
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const tx = await contract.addDocumentHash(hash);
      await tx.wait();
      setUploadStatus("✅ Certificate added to blockchain.");
      setQrHash(hash);
    } catch (err) {
      setUploadStatus("❌ Error adding certificate.");
      setQrHash("");
      console.error(err);
    }
  };

  const verifyDocument = async () => {
    if (!verifyFile) return alert("Please select a file to verify.");
    const hash = await getFileHash(verifyFile);
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const isValid = await contract.verifyDocument(hash);
      setVerifyStatus(isValid ? "✅ Certificate is VALID." : "❌ Certificate is INVALID.");
    } catch (err) {
      setVerifyStatus("❌ Error verifying certificate.");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>🎓 Blockchain Certificate System</h1>
      <div className="grid">
        {/* Upload Section */}
        <div className="section">
          <h2>⬆️ Add Certificate</h2>
          <input type="file" onChange={(e) => {
            setUploadFile(e.target.files[0]);
            setUploadStatus("");
            setQrHash("");
          }} />
          <button onClick={uploadDocument}>Add to Blockchain</button>
          <p>{uploadStatus}</p>

          {qrHash && (
            <div>
              <h4>Scan QR to Verify</h4>
              <QRCodeCanvas
                value={`http://localhost:3000/verify?hash=${qrHash}`}
                size={200}
                includeMargin
              />
              <p style={{ fontSize: "12px", wordBreak: "break-word" }}>{qrHash}</p>
            </div>
          )}
        </div>

        {/* Verify Section */}
        <div className="section">
          <h2>🔍 Verify Certificate</h2>
          <input type="file" onChange={(e) => {
            setVerifyFile(e.target.files[0]);
            setVerifyStatus("");
          }} />
          <button onClick={verifyDocument}>Verify Certificate</button>
          <p>{verifyStatus}</p>
        </div>
      </div>
    </div>
  );
}

export default App;

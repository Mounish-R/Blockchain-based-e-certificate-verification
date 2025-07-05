import React, { useState } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";

const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

function AddPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
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
    if (!file) return alert("Select a file to upload");
    const hash = await getFileHash(file);
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const tx = await contract.addDocumentHash(hash);
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
    <div className="page">
      <h1>➕ Add Certificate</h1>
      <input type="file" onChange={(e) => {
        setFile(e.target.files[0]);
        setStatus("");
        setQrHash("");
      }} />
      <button onClick={uploadDocument}>Upload to Blockchain</button>
      <p>{status}</p>

      {qrHash && (
        <div>
          <h3>QR Code (Scan to Verify)</h3>
          <QRCodeCanvas
            value={`http://localhost:3000/verify?hash=${qrHash}`}
            size={200}
            includeMargin
          />
          <p style={{ fontSize: "12px", wordBreak: "break-word" }}>{qrHash}</p>
        </div>
      )}
    </div>
  );
}

export default AddPage;

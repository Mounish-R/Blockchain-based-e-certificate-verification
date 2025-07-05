import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { useLocation } from "react-router-dom";

const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

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
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);
    try {
      const isValid = await contract.verifyDocument(hash);
      setStatus(isValid ? "✅ Certificate is VALID." : "❌ Certificate is INVALID.");
    } catch (err) {
      setStatus("❌ Error verifying certificate.");
    }
  };

  const handleManualVerify = async () => {
    if (!file) return alert("Select a file first");
    const hash = await getFileHash(file);
    verifyHash(hash);
  };

  useEffect(() => {
    if (hashFromQR) {
      verifyHash(hashFromQR);
    }
  }, [hashFromQR]);

  return (
    <div className="page">
      <h1>🔍 Verify Certificate</h1>

      {hashFromQR ? (
        <>
          <p>Verifying via QR...</p>
          <p>Hash: {hashFromQR}</p>
        </>
      ) : (
        <>
          <input type="file" onChange={(e) => {
            setFile(e.target.files[0]);
            setStatus("");
          }} />
          <button onClick={handleManualVerify}>Verify Certificate</button>
        </>
      )}

      <p>{status}</p>
    </div>
  );
}

export default VerifyPage;

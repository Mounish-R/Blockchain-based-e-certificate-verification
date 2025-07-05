import React, { useState } from "react";
import { ethers } from "ethers";
import DocVerify from "./contracts/DocVerify.json"; // 👈 We'll place ABI here
import "./App.css";

// 🔁 Replace this with your deployed contract address
const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  // 🔐 SHA-256 hashing function
  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + hashHex;
  };

  // 🔌 Connect to MetaMask & get signer
  const getSigner = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required");
      return null;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  // ⬆️ Upload Certificate
  const uploadDocument = async () => {
    if (!file) return alert("Please select a file first.");
    const hash = await getFileHash(file);
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const tx = await contract.addDocumentHash(hash);
      await tx.wait();
      setStatus("✅ Certificate added to blockchain.");
    } catch (err) {
      setStatus("❌ Error adding certificate.");
      console.error(err);
    }
  };

  // ✅ Verify Certificate
  const verifyDocument = async () => {
    if (!file) return alert("Please select a file first.");
    const hash = await getFileHash(file);
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      const isValid = await contract.verifyDocument(hash);
      setStatus(isValid ? "✅ Certificate is VALID." : "❌ Certificate is INVALID.");
    } catch (err) {
      setStatus("❌ Error verifying certificate.");
      console.error(err);
    }
  };

  return (
    <div className="app">
      <h1>🎓 University Certificate Verification</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <div className="btn-group">
        <button onClick={uploadDocument}>Add to Blockchain</button>
        <button onClick={verifyDocument}>Verify Certificate</button>
      </div>
      <p>{status}</p>
    </div>
  );
}

export default App;

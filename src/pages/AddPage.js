import React, { useState } from "react";
import { ethers } from "ethers";
import DocVerify from "../contracts/DocVerify.json";
import { QRCodeCanvas } from "qrcode.react";

const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // update after redeploy
const hardhatChainId = "0x7A69"; // 31337 in hex

function AddPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [qrHash, setQrHash] = useState("");

  // NEW KYC fields:
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

  const switchToLocalhost = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hardhatChainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hardhatChainId,
                chainName: "Hardhat Localhost",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding localhost chain:", addError);
          return false;
        }
      }
      console.error("Error switching chain:", error);
      return false;
    }
  };

  const getFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + hashHex; // bytes32-compatible hex string
  };

  const getSigner = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required");
      return null;
    }

    const switched = await switchToLocalhost();
    if (!switched) return null;

    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  const uploadDocument = async () => {
    // Basic validation: require key KYC fields + file
    if (!file || !fullName || !dob || !phone || !email) {
      return alert("Please fill in at least Full Name, DOB, Phone, Email and select a file");
    }

    const hash = await getFileHash(file);
    const signer = await getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(contractAddress, DocVerify.abi, signer);

    try {
      setStatus("⏳ Uploading to blockchain...");
      // NOTE: Order of args must match Solidity function signature
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
      <div style={{ maxWidth: "700px", width: "100%", backgroundColor: "#f9f9f9", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", color: "#333" }}>➕ Add KYC / Certificate</h1>
        <p style={{ textAlign: "center", color: "#555", marginBottom: "20px" }}>
          Fill student identity (KYC) details and upload a certificate/document.
        </p>

        {/* KYC form fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Full Name" value={fullName} onChange={(e)=>setFullName(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Date of Birth (YYYY-MM-DD)" value={dob} onChange={(e)=>setDob(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Gender" value={gender} onChange={(e)=>setGender(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Aadhaar Number" value={aadhaar} onChange={(e)=>setAadhaar(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="PAN Card Number" value={pan} onChange={(e)=>setPan(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Passport Number" value={passport} onChange={(e)=>setPassport(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Driving License Number" value={drivingLicense} onChange={(e)=>setDrivingLicense(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Voter ID" value={voterId} onChange={(e)=>setVoterId(e.target.value)} style={{padding:8, borderRadius:6}} />
          <input placeholder="Address" value={physicalAddress} onChange={(e)=>setPhysicalAddress(e.target.value)} style={{gridColumn: "1 / -1", padding:8, borderRadius:6}} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label><strong>📁 Upload Certificate File:</strong></label><br />
          <input type="file" onChange={(e)=>{ setFile(e.target.files[0]); setStatus(""); setQrHash(""); }} style={{ marginTop: "8px" }} />
        </div>

        <button onClick={uploadDocument} style={{ width: "100%", padding: "12px", marginTop:16, backgroundColor: "#4CAF50", color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          🚀 Upload to Blockchain
        </button>

        {status && <p style={{ marginTop: "20px", textAlign: "center", fontWeight: "bold", color: status.includes("✅") ? "green" : "red" }}>{status}</p>}

        {qrHash && (
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <h3>🔗 QR Code (Scan to Verify)</h3>
            <QRCodeCanvas value={`http://localhost:3000/verify?hash=${qrHash}`} size={200} includeMargin />
            <p style={{ fontSize: "12px", wordBreak: "break-word", marginTop: "10px" }}>{qrHash}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddPage;

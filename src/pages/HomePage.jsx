import React from "react";

export default function HomePage() {
  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1>🔐 Blockchain-Based KYC & Certificate Verification</h1>

      <p style={{ marginTop: 20, fontSize: 18, lineHeight: "1.6" }}>
        This platform uses blockchain technology to securely store and verify 
        identity documents and certificates. Once a certificate is uploaded, 
        its cryptographic hash is stored on the blockchain, making it 
        tamper-proof and instantly verifiable.
      </p>

      <h2 style={{ marginTop: 30 }}>🚀 How It Works</h2>
      <ul style={{ fontSize: 17, lineHeight: "1.6" }}>
        <li>Upload your certificate and KYC details on the <b>Add Certificate</b> page.</li>
        <li>The system generates a unique <b>SHA-256 hash</b>.</li>
        <li>The hash + details are stored permanently on the blockchain.</li>
        <li>A <b>QR Code</b> is generated.</li>
        <li>Anyone can scan the QR to instantly verify the document.</li>
      </ul>

      <h2 style={{ marginTop: 30 }}>🌟 Benefits</h2>
      <ul style={{ fontSize: 17, lineHeight: "1.6" }}>
        <li>✔ Immutable — cannot be tampered with</li>
        <li>✔ Transparent & Trustworthy</li>
        <li>✔ Fast verification using QR</li>
        <li>✔ No manual checking needed</li>
        <li>✔ Secure cryptographic hashing</li>
      </ul>

      <h2 style={{ marginTop: 30 }}>🔗 Start Using the System</h2>
      <p style={{ fontSize: 18 }}>
        → Go to <b>Add Certificate</b> to upload.<br />
        → Go to <b>Verify Certificate</b> to validate any document.<br />
      </p>
    </div>
  );
}

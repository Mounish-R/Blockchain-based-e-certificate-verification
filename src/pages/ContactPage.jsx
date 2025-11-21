import React, { useState } from "react";

export default function ContactPage() {
  const [result, setResult] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");

    const formData = new FormData(event.target);
    formData.append("access_key", "f01b3a5a-f02d-489d-a0f8-296ddefc0d27");

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    }).then((res) => res.json());

    if (res.success) {
      setResult("Message Sent Successfully! ✔");
    } else {
      setResult("Something went wrong ❌");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: "0 auto" }}>
      <h1>📞 Contact Us</h1>

      <p style={{ marginTop: 10, fontSize: 18 }}>
        Have questions? Need help with blockchain verification?  
        Send us a message using the form below.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
        <label>Name</label>
        <input type="text" name="name" required className="input" />

        <label>Email</label>
        <input type="email" name="email" required className="input" />

        <label>Message</label>
        <textarea name="message" required className="textarea"></textarea>

        <button type="submit" className="submitBtn">Send Message</button>
      </form>

      <div style={{ marginTop: 20, fontSize: 18, color: "#2563eb" }}>
        {result}
      </div>

      <style>{`
        .input, .textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .textarea { height: 120px; resize: vertical; }
        .submitBtn {
          padding: 12px 20px;
          background: #2563eb;
          border: none;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

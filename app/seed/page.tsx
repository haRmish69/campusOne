"use client";

import { useState } from "react";

export default function SeedPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const seedAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed-all", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>🌱 Seed All Data</h1>
      <button
        onClick={seedAll}
        disabled={loading}
        style={{
          padding: "12px 24px", fontSize: 16, cursor: "pointer",
          background: loading ? "#ccc" : "#6366f1", color: "white",
          border: "none", borderRadius: 8,
        }}
      >
        {loading ? "Seeding... (this takes ~30s)" : "Seed All Data"}
      </button>
      {result && (
        <pre style={{ marginTop: 20, background: "#f1f5f9", padding: 16, borderRadius: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

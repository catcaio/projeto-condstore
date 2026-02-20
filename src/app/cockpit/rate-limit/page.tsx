"use client";

import { useEffect, useState } from "react";

export default function RateLimitCockpit() {
  const [tenant, setTenant] = useState("tenant-1");
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/metrics/rate-limit?tenant=${tenant}`);
    const json = await res.json();
    setData(json.buckets || {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Rate Limit Cockpit</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          placeholder="tenant id"
        />
        <button onClick={load} style={{ marginLeft: 8 }}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Requests (24h)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([bucket, value]) => (
              <tr key={bucket}>
                <td>{bucket}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

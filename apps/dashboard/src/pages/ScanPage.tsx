import { useState } from 'react';
import { api } from '../api';

export function ScanPage() {
  const [uid, setUid] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onScan() {
    setError(null);
    setResult(null);
    try {
      const res = await api.searchPilgrims({ mode: 'qr', qrUid: uid.trim().toUpperCase() });
      if (!res.results.length) {
        setResult('No member found for that QR UID.');
        return;
      }
      const hit = res.results[0]!;
      setResult(`${hit.name} · ${hit.uid} · family ${hit.familyCode} · ${hit.caseStatus ?? 'ok'}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <h2>Wristband scan</h2>
          <p className="muted">QR encodes the UID only — no personal data.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div className="field">
          <label htmlFor="uid">Scanned UID</label>
          <input
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="K7M2-03"
            style={{ minHeight: 48, width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}
          />
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void onScan()}>
          Look up
        </button>
        {result ? <p style={{ marginTop: 12 }}>{result}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';

export function FoundPersonsPage() {
  const qc = useQueryClient();
  const found = useQuery({ queryKey: ['found'], queryFn: () => api.foundReports() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = found.data?.find((f) => f.id === selectedId) ?? found.data?.[0] ?? null;

  const matches = useQuery({
    queryKey: ['matches', selected?.id],
    queryFn: () => api.matches(selected!.id),
    enabled: Boolean(selected?.id),
  });

  const confirm = useMutation({
    mutationFn: (caseId: string) => api.matchCase(caseId, selected!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['found'] });
    },
  });

  return (
    <>
      <main className="main">
        <div className="topbar">
          <div>
            <h2>Found-person matching</h2>
            <p className="muted">Matching uses details and location only — no facial recognition.</p>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Open found reports</h3>
          {found.isLoading ? <div className="skeleton" /> : null}
          {found.data?.length === 0 ? (
            <div className="empty">No found persons awaiting match.</div>
          ) : null}
          {found.data && found.data.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Volunteer</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {found.data.map((f) => (
                  <tr
                    key={f.id}
                    className={`clickable${selected?.id === f.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(f.id)}
                  >
                    <td>{f.id.slice(0, 8)}</td>
                    <td>
                      {f.ageBand}, {f.gender} · {f.clothing}
                    </td>
                    <td>{f.volunteerCode ?? '—'}</td>
                    <td>{new Date(f.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </main>

      <aside className="detail">
        {selected ? (
          <>
            <h3>Found person {selected.id.slice(0, 8)}</h3>
            <p className="muted">
              Logged by {selected.volunteerCode ?? 'booth'} · {selected.clothing}
            </p>
            <div className="warn">
              Verify before confirming. Ask simple questions, check the family photo and wristband
              QR. Matching uses details only, with no facial recognition.
            </div>
            <h3>Suggested matches</h3>
            {matches.isLoading ? <div className="skeleton" /> : null}
            {matches.data?.map((m) => (
              <div
                key={m.caseId}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>
                    {m.memberUid}
                  </strong>
                  <span className={`badge badge-${m.confidence.toLowerCase()}`}>
                    {m.confidence}
                  </span>
                </div>
                <p className="muted">{m.reasons.join(' · ')}</p>
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate(m.caseId)}
                >
                  Confirm match
                </button>
              </div>
            ))}
            {matches.data?.length === 0 ? (
              <p className="muted">No suggested matches yet.</p>
            ) : null}
          </>
        ) : (
          <p className="muted">Select a found report.</p>
        )}
      </aside>
    </>
  );
}

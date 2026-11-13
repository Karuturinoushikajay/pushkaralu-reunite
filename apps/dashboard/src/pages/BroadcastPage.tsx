import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';

export function BroadcastPage() {
  const cases = useQuery({ queryKey: ['cases'], queryFn: () => api.cases() });
  const open = (cases.data ?? []).filter((c) => c.status === 'MISSING' || c.status === 'FOUND');
  const [caseId, setCaseId] = useState('');
  const activeId = caseId || open[0]?.id || '';

  const alertMut = useMutation({
    mutationFn: () => api.alertVolunteers(activeId),
  });

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <h2>Broadcast alert</h2>
          <p className="muted">Send a short alert to nearby volunteers for an open case.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div className="field">
          <label htmlFor="case">Open case</label>
          <select
            id="case"
            value={activeId}
            onChange={(e) => setCaseId(e.target.value)}
            style={{ minHeight: 48, borderRadius: 8, border: '1px solid var(--border)' }}
          >
            {open.length === 0 ? <option value="">No open cases</option> : null}
            {open.map((c) => (
              <option key={c.id} value={c.id}>
                {c.memberUid} · {c.status}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          disabled={!activeId || alertMut.isPending}
          onClick={() => alertMut.mutate()}
        >
          Alert volunteers nearby
        </button>
        {alertMut.data ? (
          <p className="muted">Alerted {alertMut.data.volunteersAlerted} volunteers.</p>
        ) : null}
        {alertMut.isError ? <p className="error">{(alertMut.error as Error).message}</p> : null}
      </div>
    </main>
  );
}

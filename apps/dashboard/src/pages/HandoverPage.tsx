import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../api';
import { StatusBadge } from './StatusBadge';

export function HandoverPage() {
  const qc = useQueryClient();
  const cases = useQuery({ queryKey: ['cases'], queryFn: () => api.cases() });
  const matched = useMemo(
    () => (cases.data ?? []).filter((c) => c.status === 'MATCHED' || c.status === 'FOUND'),
    [cases.data],
  );
  const [caseId, setCaseId] = useState<string>('');
  const activeId = caseId || matched[0]?.id || '';
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [handoverId, setHandoverId] = useState<string | undefined>();
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const [showManual, setShowManual] = useState(false);
  const [reason, setReason] = useState('No signal at the booth');
  const [idVerified, setIdVerified] = useState(true);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [supervisorId, setSupervisorId] = useState('');

  const audit = useQuery({
    queryKey: ['audit', activeId],
    queryFn: () => api.audit(activeId),
    enabled: Boolean(activeId),
  });

  const start = useMutation({
    mutationFn: () => api.startHandover(activeId),
    onSuccess: (res) => {
      setHandoverId(res.handoverId);
      setDebugCode(res.debugCode);
    },
  });

  const verify = useMutation({
    mutationFn: () => api.verifyHandover(activeId, digits.join(''), handoverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['audit', activeId] });
    },
  });

  const manual = useMutation({
    mutationFn: () =>
      api.manualClose(activeId, {
        reason,
        idVerified,
        guardianName,
        guardianPhone,
        officerNote: officerNote || undefined,
        supervisorId: supervisorId || undefined,
      }),
    onSuccess: () => {
      setShowManual(false);
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['audit', activeId] });
    },
  });

  return (
    <>
      <main className="main">
        <div className="topbar">
          <div>
            <h2>Handover and audit</h2>
            <p className="muted">Case closes after OTP. Manual close covers no signal or no OTP.</p>
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <div className="field">
            <label htmlFor="case">Matched case</label>
            <select
              id="case"
              value={activeId}
              onChange={(e) => setCaseId(e.target.value)}
              style={{ minHeight: 48, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              {matched.length === 0 ? <option value="">No matched cases</option> : null}
              {matched.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.memberUid} · {c.name ?? '—'} · {c.status}
                </option>
              ))}
            </select>
          </div>

          {activeId ? (
            <>
              <p>
                Handover: <StatusBadge status={matched.find((c) => c.id === activeId)?.status ?? 'MATCHED'} />
              </p>
              <ol>
                <li>Match confirmed by officer</li>
                <li>Guardian arrives at booth</li>
                <li>Guardian ID check + OTP</li>
                <li>Case closed (handover success)</li>
              </ol>
              <button
                className="btn btn-outline"
                type="button"
                disabled={start.isPending || !activeId}
                onClick={() => start.mutate()}
              >
                Send guardian OTP
              </button>
              {debugCode ? <p className="muted">Dev OTP: {debugCode}</p> : null}

              <p style={{ marginTop: 16 }}>Guardian OTP</p>
              <div className="otp-row">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => {
                      const next = [...digits];
                      next[i] = e.target.value.replace(/\D/g, '').slice(-1);
                      setDigits(next);
                    }}
                  />
                ))}
              </div>
              <button
                className="btn btn-success"
                type="button"
                style={{ marginTop: 12 }}
                disabled={verify.isPending || digits.join('').length !== 6}
                onClick={() => verify.mutate()}
              >
                Verify OTP and close case
              </button>
              {verify.isSuccess ? <p className="muted">Handover completed. Case reunited.</p> : null}
              {verify.isError ? (
                <p className="error">{(verify.error as Error).message}</p>
              ) : null}

              <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />
              <p className="muted">No signal, or OTP did not arrive?</p>
              <button className="btn btn-outline" type="button" onClick={() => setShowManual(true)}>
                Close manually
              </button>
            </>
          ) : null}
        </div>

        {showManual ? (
          <div className="panel" style={{ padding: 16, marginTop: 16 }}>
            <h3>Manual close: {matched.find((c) => c.id === activeId)?.memberUid}</h3>
            <p className="muted">Case is closed, not erased. Every manual close is audited.</p>
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <label>
              <input type="checkbox" checked={idVerified} onChange={(e) => setIdVerified(e.target.checked)} /> ID
              verified in person
            </label>
            <div className="field">
              <label htmlFor="gname">Guardian name</label>
              <input id="gname" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="gphone">Guardian phone</label>
              <input id="gphone" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder="+91..." />
            </div>
            <div className="field">
              <label htmlFor="note">Officer note</label>
              <input id="note" value={officerNote} onChange={(e) => setOfficerNote(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="sup">Supervisor ID (optional)</label>
              <input id="sup" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={manual.isPending || !guardianName || !guardianPhone}
                onClick={() => manual.mutate()}
              >
                Close case manually
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setShowManual(false)}>
                Cancel
              </button>
            </div>
            {manual.isError ? <p className="error">{(manual.error as Error).message}</p> : null}
            {manual.isSuccess ? <p className="muted">Case closed manually and audited.</p> : null}
          </div>
        ) : null}
      </main>

      <aside className="detail">
        <h3>Audit log</h3>
        <div className="audit">
          {audit.data?.map((a) => (
            <div key={a.id} style={{ marginBottom: 8 }}>
              {new Date(a.created_at).toLocaleTimeString()} · {a.action}
            </div>
          ))}
          {!audit.data?.length ? <p className="muted">No audit entries yet.</p> : null}
        </div>
      </aside>
    </>
  );
}

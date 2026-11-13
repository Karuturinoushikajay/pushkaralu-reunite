import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type CaseRow } from '../api';
import { StatusBadge } from './StatusBadge';

export function OpenCasesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cases'],
    queryFn: () => api.cases(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => data?.find((c) => c.id === selectedId) ?? data?.[0] ?? null,
    [data, selectedId],
  );

  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<
    Array<{ uid: string; familyCode: string; name: string; caseStatus: string | null }>
  >([]);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['case', selected?.id],
    queryFn: () => api.case(selected!.id),
    enabled: Boolean(selected?.id),
  });

  const alertMut = useMutation({
    mutationFn: () => api.alertVolunteers(selected!.id),
  });
  const foundMut = useMutation({
    mutationFn: () => api.markFound(selected!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
  const registerMut = useMutation({
    mutationFn: (memberUid: string) =>
      api.registerFromFind({
        memberUid,
        callOutcome: 'NO_RESPONSE',
        location: { lng: 81.7795, lat: 16.9846 },
        locationLabel: 'Booth desk',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      setSearchMsg('Case registered from find.');
    },
  });

  const missingCases = useMemo(
    () => (data ?? []).filter((c) => c.status === 'MISSING'),
    [data],
  );
  const foundCases = useMemo(
    () => (data ?? []).filter((c) => c.status === 'FOUND' || c.status === 'MATCHED'),
    [data],
  );

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      open: rows.filter((c) => c.status === 'MISSING').length,
      awaiting: rows.filter((c) => c.status === 'FOUND' || c.status === 'MATCHED').length,
      reunited: rows.filter((c) => c.status === 'REUNITED').length,
    };
  }, [data]);

  async function runSearch() {
    setSearchMsg(null);
    const q = query.trim();
    if (!q) return;
    const isFamily = /^[A-Z0-9]{4}$/i.test(q);
    const isUid = /^[A-Z0-9]{4}-[0-9]{2}$/i.test(q);
    const isAadhaar = /^\d{12}$/.test(q.replace(/\D/g, ''));
    const res = await api.searchPilgrims(
      isUid
        ? { mode: 'qr', qrUid: q.toUpperCase() }
        : isAadhaar
          ? { mode: 'aadhaar', aadhaarNumber: q.replace(/\D/g, '') }
          : isFamily
            ? { mode: 'familyId', familyId: q.toUpperCase() }
            : { mode: 'name', name: q },
    );
    setSearchHits(res.results);
    if (res.faceMatchDisabled) setSearchMsg('Face match is disabled until legal approval.');
  }

  return (
    <>
      <main className="main">
        <div className="topbar">
          <div>
            <h2>Booth 07, Kotilingala Ghat</h2>
            <p className="muted">Officer on duty · Synced just now</p>
          </div>
          <Link className="btn btn-amber" to="/found">
            Report found person
          </Link>
        </div>

        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <h3>Find / register case</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, family ID, Aadhaar, QR UID"
              style={{ flex: 1, minHeight: 44, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}
            />
            <button className="btn btn-primary" type="button" onClick={() => void runSearch()}>
              Search
            </button>
          </div>
          {searchMsg ? <p className="muted">{searchMsg}</p> : null}
          {searchHits.length > 0 ? (
            <ul style={{ marginTop: 12 }}>
              {searchHits.map((h) => (
                <li key={h.uid} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span>
                    {h.name} · {h.uid} · {h.caseStatus ?? 'REGISTERED'}
                  </span>
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={registerMut.isPending}
                    onClick={() => registerMut.mutate(h.uid)}
                  >
                    Register case
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="stats">
          <div className="stat">
            Open missing cases
            <strong>{stats.open}</strong>
          </div>
          <div className="stat">
            Found, awaiting match
            <strong>{stats.awaiting}</strong>
          </div>
          <div className="stat">
            Reunited today
            <strong>{stats.reunited}</strong>
          </div>
        </div>

        <div className="panel">
          <h3>Missing cases</h3>
          {isLoading ? <div className="skeleton" /> : null}
          {isError ? (
            <div className="error">
              Could not load cases.{' '}
              <button className="btn btn-outline" type="button" onClick={() => refetch()}>
                Try again
              </button>
            </div>
          ) : null}
          {!isLoading && missingCases.length === 0 ? (
            <div className="empty">No missing cases — found people move to Found / Handover.</div>
          ) : null}
          {missingCases.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name & age</th>
                  <th>Last seen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {missingCases.map((c: CaseRow) => (
                  <tr
                    key={c.id}
                    className={`clickable missing${selected?.id === c.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td>{c.memberUid}</td>
                    <td>
                      {c.name ?? '—'}, {c.ageBand ?? '—'}
                    </td>
                    <td>{c.lastSeenLabel ?? '—'}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Found / at booth (yellow)</h3>
          {foundCases.length === 0 ? (
            <div className="empty">No found cases awaiting booth match or family OTP.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name & age</th>
                  <th>Last seen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {foundCases.map((c: CaseRow) => (
                  <tr
                    key={c.id}
                    className={`clickable${selected?.id === c.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td>{c.memberUid}</td>
                    <td>
                      {c.name ?? '—'}, {c.ageBand ?? '—'}
                    </td>
                    <td>{c.lastSeenLabel ?? '—'}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <aside className="detail">
        {detail.isLoading ? <div className="skeleton" /> : null}
        {detail.data ? (
          <>
            <h3>Case {detail.data.memberUid}</h3>
            <div className="photo" aria-hidden />
            <div>
              <strong>
                {detail.data.name ?? 'Unknown'}, {detail.data.ageBand ?? '—'}
              </strong>
              <p className="muted">{detail.data.note ?? 'No description yet'}</p>
              <p className="muted">Guardian: {detail.data.guardianPhoneMasked ?? '—'}</p>
            </div>
            <div className="map-box">
              {detail.data.lastSeen ? (
                <p style={{ padding: 12 }} className="muted">
                  Last seen {detail.data.lastSeen.lat.toFixed(4)},{' '}
                  {detail.data.lastSeen.lng.toFixed(4)}
                  {detail.data.nearestBooth
                    ? ` · ${detail.data.nearestBooth.code} (${detail.data.nearestBooth.distanceMeters} m)`
                    : ''}
                </p>
              ) : (
                <p style={{ padding: 12 }} className="muted">
                  No last-seen pin
                </p>
              )}
            </div>
            <div className="stack">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setQuery(detail.data!.memberUid.slice(0, 4));
                  void runSearch();
                }}
              >
                Add search (find family)
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={alertMut.isPending}
                onClick={() => alertMut.mutate()}
              >
                Alert volunteers nearby
              </button>
              <button
                className="btn btn-outline"
                type="button"
                disabled={foundMut.isPending}
                onClick={() => foundMut.mutate()}
              >
                Mark found + notify family
              </button>
              <Link className="btn btn-outline" to="/handover" style={{ textAlign: 'center' }}>
                Handover with guardian OTP
              </Link>
            </div>
            {alertMut.data ? (
              <p className="muted">Alerted {alertMut.data.volunteersAlerted} volunteers.</p>
            ) : null}
          </>
        ) : (
          <p className="muted">Select a case to inspect details.</p>
        )}
      </aside>
    </>
  );
}

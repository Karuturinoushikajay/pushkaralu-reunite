let accessToken: string | null = localStorage.getItem('pr_token');

export function setToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface CaseRow {
  id: string;
  memberUid: string;
  status: string;
  lastSeenLabel: string | null;
  note: string | null;
  reportedAt: string;
  lastSeen: { lng: number; lat: number } | null;
  name?: string | null;
  ageBand?: string | null;
  nearestBooth?: {
    code: string;
    name: string;
    officerName: string | null;
    distanceMeters: number;
  } | null;
  guardianPhoneMasked?: string | null;
}

export interface FoundRow {
  id: string;
  scannedUid: string | null;
  ageBand: string | null;
  gender: string | null;
  clothing: string | null;
  languageSpoken: string | null;
  status: string;
  createdAt: string;
  location: { lng: number; lat: number } | null;
  volunteerCode: string | null;
}

export interface MatchRow {
  memberUid: string;
  caseId: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export const api = {
  login(loginUid: string, password: string) {
    return request<{
      uid: string;
      role: string;
      tokens: { accessToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginUid, password }),
    });
  },
  cases(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<CaseRow[]>(`/cases${q}`);
  },
  case(id: string) {
    return request<CaseRow>(`/cases/${id}`);
  },
  foundReports() {
    return request<FoundRow[]>('/found-reports');
  },
  matches(foundId: string) {
    return request<MatchRow[]>(`/found-reports/${foundId}/matches`);
  },
  matchCase(caseId: string, foundReportId: string) {
    return request(`/cases/${caseId}/match`, {
      method: 'POST',
      body: JSON.stringify({ foundReportId }),
    });
  },
  alertVolunteers(caseId: string) {
    return request<{ volunteersAlerted: number }>(`/cases/${caseId}/alert-volunteers`, {
      method: 'POST',
    });
  },
  markFound(caseId: string) {
    return request(`/cases/${caseId}/mark-found`, { method: 'POST' });
  },
  startHandover(caseId: string) {
    return request<{
      handoverId: string;
      challengeId: string;
      maskedPhone: string;
      debugCode?: string;
    }>(`/cases/${caseId}/handover/start`, { method: 'POST' });
  },
  verifyHandover(caseId: string, code: string, handoverId?: string) {
    return request(`/cases/${caseId}/handover/verify`, {
      method: 'POST',
      body: JSON.stringify({ code, handoverId }),
    });
  },
  audit(caseId: string) {
    return request<
      Array<{ id: string; action: string; created_at: string; metadata: unknown }>
    >(`/cases/${caseId}/audit`);
  },
  searchPilgrims(body: {
    mode: 'name' | 'familyId' | 'aadhaar' | 'photo' | 'qr';
    name?: string;
    familyId?: string;
    aadhaarNumber?: string;
    photoKey?: string;
    qrUid?: string;
    ageBand?: string;
  }) {
    return request<{
      faceMatchDisabled: boolean;
      results: Array<{
        uid: string;
        familyCode: string;
        name: string;
        ageBand: string | null;
        caseStatus: string | null;
        faceMatchScore?: number;
        hasPhoto: boolean;
      }>;
    }>('/search/pilgrims', { method: 'POST', body: JSON.stringify(body) });
  },
  registerFromFind(body: {
    memberUid: string;
    callOutcome: 'RESPONDED' | 'NO_RESPONSE';
    location: { lng: number; lat: number };
    locationLabel?: string;
    clothing?: string;
  }) {
    return request<{ caseId: string; memberUid: string; status: string }>(
      '/cases/register-from-find',
      { method: 'POST', body: JSON.stringify(body) },
    );
  },
  manualClose(
    caseId: string,
    body: {
      reason: string;
      idVerified: boolean;
      guardianName: string;
      guardianPhone: string;
      officerNote?: string;
      supervisorId?: string;
    },
  ) {
    return request(`/cases/${caseId}/handover/manual-close`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

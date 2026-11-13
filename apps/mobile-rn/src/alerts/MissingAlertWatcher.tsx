import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { getAlertMuted, getSeenCaseIds, rememberSeenCaseIds, setAlertMuted } from './alertPrefs';
import { isAlertAudioPrimed, playAlertSoundNow, unlockAlertAudio } from './alertSound';

/** Booth 07 — Kotilingala Ghat. */
const BOOTH = { lat: 16.9846, lng: 81.7795 };
/** Volunteers: alert when case last-seen is within this of their GPS (or booth). */
const VOLUNTEER_NEAR_METERS = 15_000;
const POLL_MS = 8_000;

type Flash = {
  caseId: string;
  memberUid: string;
  name?: string | null;
  distanceMeters: number | null;
};

type Ctx = {
  muted: boolean;
  setMuted: (v: boolean) => void;
  flash: Flash | null;
  dismissFlash: () => void;
  lastCheckAt: number | null;
  soundStatus: string | null;
  testSound: () => string;
};

const MissingAlertCtx = createContext<Ctx | null>(null);

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type CaseRow = {
  id: string;
  memberUid: string;
  name?: string | null;
  status: string;
  lastSeen?: { lat: number; lng: number } | null;
};

type VolRow = {
  caseId: string;
  memberUid: string;
  displayName: string | null;
  distanceMeters: number | null;
};

export function MissingAlertProvider({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth();
  const [muted, setMutedState] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [lastCheckAt, setLastCheckAt] = useState<number | null>(null);
  const [soundStatus, setSoundStatus] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  const active = Boolean(token && (role === 'POLICE' || role === 'VOLUNTEER'));

  useEffect(() => {
    void getAlertMuted().then(setMutedState);
    void getSeenCaseIds().then((s) => {
      seenRef.current = s;
    });
  }, []);

  const setMuted = useCallback((v: boolean) => {
    setMutedState(v);
    void setAlertMuted(v);
    if (!v) unlockAlertAudio();
  }, []);

  const dismissFlash = useCallback(() => setFlash(null), []);

  const testSound = useCallback(() => {
    unlockAlertAudio();
    const status = playAlertSoundNow();
    setSoundStatus(status);
    return status;
  }, []);

  const poll = useCallback(async () => {
    if (!active) return;
    try {
      let flashes: Flash[] = [];

      if (role === 'VOLUNTEER') {
        let lng = BOOTH.lng;
        let lat = BOOTH.lat;
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({});
            lng = pos.coords.longitude;
            lat = pos.coords.latitude;
          }
        } catch {
          // keep booth default
        }
        const rows = await api.get<VolRow[]>(
          `/volunteer/alerts?lng=${lng}&lat=${lat}&radiusMeters=${VOLUNTEER_NEAR_METERS}`,
        );
        const list = Array.isArray(rows) ? rows : [];
        // Include all MISSING returned (API already distance-sorted); prefer near ones for banner text.
        flashes = list.map((r) => ({
          caseId: r.caseId,
          memberUid: r.memberUid,
          name: r.displayName,
          distanceMeters: r.distanceMeters,
        }));
      } else {
        // Police booth desk: every new MISSING must alert (GPS from family laptop may be far from ghat).
        const rows = await api.get<CaseRow[]>('/cases');
        flashes = (Array.isArray(rows) ? rows : [])
          .filter((c) => c.status === 'MISSING')
          .map((c) => {
            const dist = c.lastSeen
              ? Math.round(
                  haversineMeters(BOOTH.lat, BOOTH.lng, c.lastSeen.lat, c.lastSeen.lng),
                )
              : null;
            return {
              caseId: c.id,
              memberUid: c.memberUid,
              name: c.name,
              distanceMeters: dist,
            };
          });
      }

      const ids = flashes.map((f) => f.caseId);
      const seen = seenRef.current;

      if (!primedRef.current) {
        // First poll: seed seen set, no sound (avoid blast on login).
        for (const id of ids) seen.add(id);
        primedRef.current = true;
        await rememberSeenCaseIds(seen);
        setLastCheckAt(Date.now());
        return;
      }

      const fresh = flashes.filter((f) => !seen.has(f.caseId));
      for (const id of ids) seen.add(id);
      if (fresh.length) {
        await rememberSeenCaseIds(seen);
        const top = fresh[0]!;
        setFlash(top);
        if (!muted) {
          // Works best after a prior Test sound tap on the phone.
          const status = playAlertSoundNow();
          setSoundStatus(status);
        }
      } else {
        await rememberSeenCaseIds(seen);
      }
      setLastCheckAt(Date.now());
    } catch {
      // keep silent on network blips
    }
  }, [active, muted, role]);

  useEffect(() => {
    if (!active) {
      primedRef.current = false;
      setFlash(null);
      return;
    }
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void poll();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active, poll]);

  const value = useMemo(
    () => ({ muted, setMuted, flash, dismissFlash, lastCheckAt, soundStatus, testSound }),
    [muted, setMuted, flash, dismissFlash, lastCheckAt, soundStatus, testSound],
  );

  return (
    <MissingAlertCtx.Provider value={value}>
      {children}
      {flash ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 48,
            left: 12,
            right: 12,
            zIndex: 1000,
          }}
        >
          <Pressable
            onPress={() => {
              unlockAlertAudio();
              const status = playAlertSoundNow();
              setSoundStatus(status);
              dismissFlash();
            }}
            style={{
              backgroundColor: colors.alert,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#7A160F',
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 16 }}>
              NEW MISSING reported
            </Text>
            <Text style={{ color: colors.white, marginTop: 4 }}>
              {flash.name ?? flash.memberUid} · {flash.memberUid}
              {flash.distanceMeters != null ? ` · ~${flash.distanceMeters} m` : ''}
            </Text>
            <Text style={{ color: '#FDECEB', marginTop: 6, fontSize: 12 }}>
              {isAlertAudioPrimed()
                ? 'Tap to dismiss (plays sound)'
                : 'Tap banner to enable + play sound'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </MissingAlertCtx.Provider>
  );
}

export function useMissingAlertPrefs() {
  const ctx = useContext(MissingAlertCtx);
  if (!ctx) throw new Error('useMissingAlertPrefs outside MissingAlertProvider');
  return ctx;
}

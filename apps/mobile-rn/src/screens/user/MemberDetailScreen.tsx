import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { caseStatusLabelI18n, colors } from '../../theme';
import { ErrorText, Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberDetail'>;

type Member = {
  uid: string;
  name: string | null;
  ageBand: string | null;
  caseStatus: string | null;
  caseId?: string | null;
};

const BOOTH = { lat: 16.9846, lng: 81.7795 };

async function openBoothMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
    return;
  }
  await Linking.openURL(url);
}

export function MemberDetailScreen({ route, navigation }: Props) {
  const { uid } = route.params;
  const { t } = useI18n();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMember(await api.get<Member>(`/members/${uid}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // If opened while FOUND, send user to maps (don't leave them on Report Missing).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const m = await api.get<Member>(`/members/${uid}`);
          if (cancelled) return;
          setMember(m);
          if (m.caseStatus === 'FOUND') {
            let lat = BOOTH.lat;
            let lng = BOOTH.lng;
            if (m.caseId) {
              try {
                const detail = await api.get<{
                  nearestBooth?: { location?: { lat: number; lng: number } | null };
                }>(`/cases/${m.caseId}`);
                const loc = detail.nearestBooth?.location;
                if (loc) {
                  lat = loc.lat;
                  lng = loc.lng;
                }
              } catch {
                // use booth default
              }
            }
            await openBoothMaps(lat, lng);
            navigation.navigate('UserTabs', { screen: 'Home' });
          } else if (m.caseStatus === 'MATCHED' && m.caseId) {
            navigation.replace('CaseDetail', { caseId: m.caseId });
          } else if (m.caseStatus === 'MISSING' && m.caseId) {
            navigation.replace('CaseDetail', { caseId: m.caseId });
          }
        } catch {
          // stay on screen
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [uid, navigation]),
  );

  async function reportMissing() {
    setLoading(true);
    setError(null);
    try {
      const booth = { lng: 81.7795, lat: 16.9846 };
      let lng = booth.lng;
      let lat = booth.lat;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(pos.coords.latitude - booth.lat);
        const dLng = toRad(pos.coords.longitude - booth.lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(booth.lat)) *
            Math.cos(toRad(pos.coords.latitude)) *
            Math.sin(dLng / 2) ** 2;
        const meters = 2 * 6371000 * Math.asin(Math.sqrt(a));
        if (meters <= 20_000) {
          lng = pos.coords.longitude;
          lat = pos.coords.latitude;
        }
      }
      await api.post<{ id: string }>('/cases/report-missing', {
        memberUid: uid,
        lastSeen: { lng, lat },
        lastSeenLabel: 'Ghat 3 steps',
        note: 'Reported from React Native app',
      });
      navigation.navigate('UserTabs', { screen: 'Home' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function goToBooth() {
    setLoading(true);
    setError(null);
    try {
      let lat = BOOTH.lat;
      let lng = BOOTH.lng;
      if (member?.caseId) {
        const detail = await api.get<{
          nearestBooth?: { location?: { lat: number; lng: number } | null };
        }>(`/cases/${member.caseId}`);
        const loc = detail.nearestBooth?.location;
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        }
      }
      await openBoothMaps(lat, lng);
      navigation.navigate('UserTabs', { screen: 'Home' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open maps');
    } finally {
      setLoading(false);
    }
  }

  if (!member && !error) return <Loading />;

  const status = member?.caseStatus ?? null;
  const isFound = status === 'FOUND';
  const hasOpenCase = Boolean(status && status !== 'REUNITED' && status !== 'CLOSED');

  return (
    <Screen>
      <Title>
        {member?.name} ({uid})
      </Title>
      <Text style={{ marginBottom: 12 }}>
        {member?.ageBand ?? ''} · {t(I18N_KEYS.memberPhotoDetails)}
      </Text>
      <View
        style={{
          height: 160,
          backgroundColor: '#E8EEF4',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text>
          {status === 'MISSING'
            ? t(I18N_KEYS.memberLastSeenPin)
            : isFound
              ? t(I18N_KEYS.memberFoundGoBooth)
              : t(I18N_KEYS.memberLastSeenGps)}
        </Text>
      </View>
      <ErrorText message={error} />

      {status ? (
        <Text
          style={{
            color: isFound ? '#9A6700' : colors.alert,
            fontWeight: '800',
            marginBottom: 12,
          }}
        >
          {caseStatusLabelI18n(status, t)}
        </Text>
      ) : null}

      {isFound ? (
        <PrimaryButton
          label={loading ? '…' : t(I18N_KEYS.actionNavigateToBooth)}
          tone="amber"
          onPress={() => void goToBooth()}
          disabled={loading}
        />
      ) : (
        <PrimaryButton
          label={loading ? '…' : t(I18N_KEYS.actionReportMissing)}
          tone="alert"
          onPress={reportMissing}
          disabled={loading || hasOpenCase}
        />
      )}

      {hasOpenCase && !isFound ? (
        <Text style={{ color: colors.alert, fontWeight: '700', marginBottom: 8 }}>
          {t(I18N_KEYS.memberOpenCase)}: {status}
        </Text>
      ) : null}

      <PrimaryButton
        label={t(I18N_KEYS.actionShowQr)}
        tone="outline"
        onPress={() => navigation.navigate('WristbandQr', { uid })}
      />
      <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 8 }}>
        {isFound ? t(I18N_KEYS.memberFoundHint) : t(I18N_KEYS.reportMissingAlertSent)}
      </Text>
    </Screen>
  );
}

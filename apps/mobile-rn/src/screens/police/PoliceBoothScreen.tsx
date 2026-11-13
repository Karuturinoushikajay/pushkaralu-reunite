import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { ErrorText, Loading, PrimaryButton, Screen, Title } from '../../ui';

type BoothDetail = {
  id: string;
  code: string;
  name: string;
  officerName: string | null;
  informant: string | null;
  officerLoginUid?: string;
  location: { lng: number; lat: number } | null;
};

export function PoliceBoothScreen() {
  const { uid } = useAuth();
  const [booth, setBooth] = useState<BoothDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooth(await api.get<BoothDetail>('/booths/me'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load booth');
      setBooth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <Loading />;

  return (
    <Screen>
      <Title>Allocated booth</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>
        Your desk assignment after police login
      </Text>
      <ErrorText message={error} />
      {booth ? (
        <View
          style={{
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>BOOTH CODE</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 12 }}>
            {booth.code}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>NAME</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>{booth.name}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>DESK OFFICER</Text>
          <Text style={{ marginBottom: 12 }}>{booth.officerName ?? '—'}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>LOGGED IN AS</Text>
          <Text style={{ marginBottom: 12 }}>{booth.officerLoginUid ?? uid ?? '—'}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>INFORMANT</Text>
          <Text style={{ marginBottom: 12 }}>{booth.informant ?? '—'}</Text>
          {booth.location ? (
            <>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>LOCATION</Text>
              <Text>
                {booth.location.lat.toFixed(5)}, {booth.location.lng.toFixed(5)}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
      {booth?.location ? (
        <PrimaryButton
          label="Open in maps"
          tone="amber"
          onPress={() => {
            const { lat, lng } = booth.location!;
            void Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            );
          }}
        />
      ) : null}
      <PrimaryButton label="Refresh" tone="outline" onPress={() => void load()} />
    </Screen>
  );
}

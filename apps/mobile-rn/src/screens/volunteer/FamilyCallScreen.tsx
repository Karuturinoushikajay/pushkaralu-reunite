import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { api } from '../../api';
import { colors } from '../../theme';
import { ErrorText, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyCall'>;

export function FamilyCallScreen({ route, navigation }: Props) {
  const { hit } = route.params;
  const [family, setFamily] = useState<Array<{ uid: string; name: string; relation: string; hasPhone: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ family: typeof family }>(`/search/pilgrims/${hit.uid}/family`)
      .then((res) => setFamily(res.family));
  }, [hit.uid]);

  async function register(outcome: 'RESPONDED' | 'NO_RESPONSE') {
    setLoading(true);
    setError(null);
    try {
      let lng = 81.7795;
      let lat = 16.9846;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lng = pos.coords.longitude;
        lat = pos.coords.latitude;
      }
      const res = await api.post<Record<string, unknown>>('/cases/register-from-find', {
        memberUid: hit.uid,
        callOutcome: outcome,
        location: { lng, lat },
        locationLabel: 'Ghat 3 steps',
        clothing: 'As observed',
        boothCode: 'BOOTH-07',
      });
      navigation.replace('CaseRegistered', { payload: res });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>
        {hit.name} ({hit.uid})
      </Title>
      {hit.caseStatus ? (
        <Text style={{ color: colors.alert, fontWeight: '700', marginBottom: 8 }}>{hit.caseStatus}</Text>
      ) : null}
      <Text style={{ fontWeight: '700' }}>Pick the call outcome</Text>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>
        Numbers are hidden. Call is logged. Case is registered either way.
      </Text>
      {family.map((f) => (
        <View key={f.uid} style={{ backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <Text style={{ fontWeight: '600' }}>
            {f.relation} {f.name}
          </Text>
          <Text style={{ color: colors.muted }}>
            {f.hasPhone ? 'Number hidden. Call is logged.' : 'No phone on file'}
          </Text>
        </View>
      ))}
      <ErrorText message={error} />
      <PrimaryButton
        label="Family responded: register case"
        onPress={() => void register('RESPONDED')}
        disabled={loading}
      />
      <PrimaryButton
        label="No response: register case"
        tone="outline"
        onPress={() => void register('NO_RESPONSE')}
        disabled={loading}
      />
    </Screen>
  );
}

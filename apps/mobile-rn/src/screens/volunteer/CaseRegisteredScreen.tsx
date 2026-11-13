import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { colors } from '../../theme';
import { ErrorText, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseRegistered'>;

export function CaseRegisteredScreen({ route, navigation }: Props) {
  const { payload } = route.params;
  const booth = payload.booth as
    | { code?: string; name?: string; distanceMeters?: number }
    | undefined;
  const caseId = payload.caseId as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function boothSuccess() {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/cases/${caseId}/handover/booth-success`, { note: 'Handed to booth' });
      navigation.replace('VolunteerHome');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Case registered</Title>
      <View
        style={{
          backgroundColor: colors.warningBg,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: '700', fontSize: 18, color: '#9A6700' }}>
          FOUND: {String(payload.memberUid)}
        </Text>
        <Text style={{ color: '#9A6700' }}>Not reunited yet — take them to the booth</Text>
        <Text>{booth?.code ?? 'Booth'} has been alerted</Text>
      </View>
      <Text style={{ fontWeight: '700' }}>Next steps</Text>
      <Text>1. Stay with the person, stay visible</Text>
      <Text>
        2. Walk to {booth?.code ?? 'booth'}
        {booth?.distanceMeters != null ? ` (${booth.distanceMeters} m)` : ''}
      </Text>
      <Text>3. At booth: tap below → MATCHED, then family uses OTP → green</Text>
      <PrimaryButton label={`Navigate to ${booth?.code ?? 'booth'}`} tone="amber" onPress={() => {}} />
      <ErrorText message={error} />
      <PrimaryButton
        label={loading ? '…' : 'Arrived at booth → MATCHED'}
        onPress={boothSuccess}
        disabled={loading}
      />
    </Screen>
  );
}

import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { PrimaryButton, Screen, Title } from '../ui';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountReady'>;

export function AccountReadyScreen({ route, navigation }: Props) {
  const { uid, wristbandQr } = route.params;
  return (
    <Screen>
      <Title>Account ready</Title>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>Your unique ID</Text>
      <Text style={{ fontSize: 28, fontWeight: '700', marginVertical: 8 }}>{uid}</Text>
      <Text style={{ backgroundColor: colors.successBg, alignSelf: 'flex-start', padding: 8, borderRadius: 8 }}>
        VERIFIED
      </Text>
      <Text style={{ marginTop: 16, fontWeight: '700' }}>Wristband QR (print or save)</Text>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>
        Payload: {wristbandQr?.payload ?? uid} — UID only, no personal data.
      </Text>
      <PrimaryButton label="Continue to map download" tone="amber" onPress={() => navigation.replace('MapDownload')} />
    </Screen>
  );
}

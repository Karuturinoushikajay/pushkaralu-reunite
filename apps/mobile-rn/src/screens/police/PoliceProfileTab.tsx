import React, { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMissingAlertPrefs } from '../../alerts/MissingAlertWatcher';
import { unlockAlertAudio } from '../../alerts/alertSound';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

export function PoliceProfileTab() {
  const { uid, logout } = useAuth();
  const { muted, setMuted, testSound, soundStatus } = useMissingAlertPrefs();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  return (
    <Screen>
      <Title>{uid ?? 'Officer'}</Title>
      <Text style={{ marginBottom: 16 }}>Role: POLICE · see Booth tab for allocation</Text>

      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Missing alert sound</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        On phones: turn media volume up, then tap Test. You should hear a beep and feel a vibrate.
      </Text>
      <PrimaryButton
        label={muted ? 'Sound is OFF — tap to unmute' : 'Sound is ON — tap to mute'}
        tone={muted ? 'outline' : 'amber'}
        onPress={() => {
          unlockAlertAudio();
          setMuted(!muted);
        }}
      />
      <PrimaryButton
        label="Test alert sound"
        tone="amber"
        onPress={() => {
          const status = testSound();
          setLocalStatus(status);
        }}
      />
      {localStatus || soundStatus ? (
        <Text style={{ marginTop: 8, marginBottom: 8, fontWeight: '700', color: colors.navy }}>
          {localStatus ?? soundStatus}
        </Text>
      ) : null}

      <PrimaryButton
        label="Register case"
        tone="outline"
        onPress={() => navigation.navigate('PoliceRegisterCase')}
      />
      <PrimaryButton
        label="Scan wristband QR"
        tone="outline"
        onPress={() => navigation.navigate('ScanQr')}
      />
      <PrimaryButton label="Log out" tone="alert" onPress={() => void logout()} />
    </Screen>
  );
}

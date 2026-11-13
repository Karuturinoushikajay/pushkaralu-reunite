import React, { useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { unlockAlertAudio } from '../../alerts/alertSound';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { BrandLogo, ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PoliceLogin'>;

export function PoliceLoginScreen({ navigation }: Props) {
  const { saveSession } = useAuth();
  const [officerId, setOfficerId] = useState('BOOTH07-OFFICER');
  const [password, setPassword] = useState('booth07pass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    unlockAlertAudio();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        uid: string;
        role: string;
        tokens: { accessToken: string };
      }>('/auth/login', {
        loginUid: officerId.trim().toUpperCase(),
        password,
      });
      if (res.role !== 'POLICE') {
        setError('This ID is not a police / booth officer account. Use family or volunteer login.');
        return;
      }
      await saveSession(res.tokens.accessToken, res.uid, res.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <BrandLogo width={160} />
      <Title>Police / booth login</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>
        Separate from family and volunteer. Use your booth officer ID.
      </Text>
      <Field
        value={officerId}
        onChangeText={setOfficerId}
        placeholder="Officer ID (BOOTH07-OFFICER)"
        autoCapitalize="characters"
      />
      <Field
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <ErrorText message={error} />
      <PrimaryButton
        label={loading ? '…' : 'Login as police'}
        tone="amber"
        onPress={() => void onLogin()}
        disabled={loading}
      />
      <PrimaryButton
        label="Create police credentials"
        tone="outline"
        onPress={() => navigation.navigate('PoliceCreateCredentials')}
      />
    </Screen>
  );
}

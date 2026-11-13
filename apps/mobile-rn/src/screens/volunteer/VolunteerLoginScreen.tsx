import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { unlockAlertAudio } from '../../alerts/alertSound';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { BrandLogo, ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VolunteerLogin'>;

export function VolunteerLoginScreen({ navigation }: Props) {
  const { saveSession } = useAuth();
  const [code, setCode] = useState('VOL-0214');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    unlockAlertAudio();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ challengeId: string; debugCode?: string }>(
        '/auth/volunteer/request-otp',
        { volunteerCode: code.trim() },
      );
      setChallengeId(res.challengeId);
      if (res.debugCode) setOtp(res.debugCode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        uid: string;
        role: string;
        tokens: { accessToken: string };
      }>('/auth/volunteer/verify-otp', { challengeId, code: otp.trim() });
      if (res.role !== 'VOLUNTEER') {
        setError('This account is not a volunteer. Use family or police login.');
        return;
      }
      await saveSession(res.tokens.accessToken, res.uid, res.role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <BrandLogo width={160} />
      <Title>Volunteer login</Title>
      <Field value={code} onChangeText={setCode} placeholder="Volunteer ID (VOL-0214)" autoCapitalize="characters" />
      {!challengeId ? (
        <PrimaryButton label={loading ? '…' : 'Send OTP'} onPress={requestOtp} disabled={loading} />
      ) : (
        <>
          <Field value={otp} onChangeText={setOtp} placeholder="Phone OTP" keyboardType="number-pad" maxLength={6} />
          <PrimaryButton label={loading ? '…' : 'Login'} onPress={verify} disabled={loading} />
        </>
      )}
      <ErrorText message={error} />
      <PrimaryButton
        label="Create volunteer credentials"
        tone="outline"
        onPress={() => navigation.navigate('VolunteerCreateCredentials')}
      />
    </Screen>
  );
}

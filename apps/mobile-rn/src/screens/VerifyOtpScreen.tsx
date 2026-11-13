import React, { useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../ui';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

export function VerifyOtpScreen({ route, navigation }: Props) {
  const { challengeId, maskedPhone, debugCode } = route.params;
  const { saveSession } = useAuth();
  const [code, setCode] = useState(debugCode ?? '');
  const [photoTaken, setPhotoTaken] = useState(false);
  const [faceConsent, setFaceConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (!photoTaken) {
      setError('Capture a live photo to finish');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        uid: string;
        role: string;
        tokens: { accessToken: string };
        wristbandQr?: { payload: string; pngBase64: string };
      }>('/auth/verify-otp', { challengeId, code: code.trim() });
      await saveSession(res.tokens.accessToken, res.uid, res.role);
      navigation.replace('AccountReady', {
        uid: res.uid,
        wristbandQr: res.wristbandQr,
        faceConsentAccepted: faceConsent,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Verify phone</Title>
      <Text style={{ marginBottom: 12 }}>OTP sent to {maskedPhone}</Text>
      <Field value={code} onChangeText={setCode} placeholder="6-digit OTP" keyboardType="number-pad" maxLength={6} />
      <Text style={{ fontWeight: '700', marginTop: 8 }}>Live photo</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        Take a clear face photo. Used for face recognition after approval.
      </Text>
      <PrimaryButton
        label={photoTaken ? 'Photo captured' : 'Tap to open camera'}
        tone="outline"
        onPress={() => setPhotoTaken(true)}
      />
      <PrimaryButton
        label={faceConsent ? '✓ Face recognition consent' : 'Agree to face recognition'}
        tone={faceConsent ? 'amber' : 'outline'}
        onPress={() => setFaceConsent((v) => !v)}
      />
      <ErrorText message={error} />
      <PrimaryButton label={loading ? '…' : 'Finish'} tone="amber" onPress={finish} disabled={loading} />
    </Screen>
  );
}

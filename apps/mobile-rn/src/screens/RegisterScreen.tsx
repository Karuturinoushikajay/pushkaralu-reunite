import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { colors } from '../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../ui';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [emergency, setEmergency] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!consent) {
      setError('Reunification consent is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        challengeId: string;
        maskedPhone: string;
        debugCode?: string;
      }>('/auth/register', {
        name: name.trim(),
        ownPhone: phone.trim(),
        address: address.trim(),
        aadhaarNumber: digits,
        emergencyPhone: emergency.trim(),
        photoKey: `photos/pending-${Date.now()}.jpg`,
        password,
        confirmPassword: confirm,
        preferredLanguage: 'en',
        reunificationConsent: true,
        faceConsentAccepted: false,
      });
      navigation.navigate('VerifyOtp', {
        challengeId: res.challengeId,
        maskedPhone: res.maskedPhone,
        debugCode: res.debugCode,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Title>Create account</Title>
        <Field value={name} onChangeText={setName} placeholder="Name *" />
        <Field value={phone} onChangeText={setPhone} placeholder="Own phone * (+91…)" keyboardType="phone-pad" />
        <Field value={address} onChangeText={setAddress} placeholder="Address *" />
        <Field
          value={aadhaar}
          onChangeText={setAadhaar}
          placeholder="Aadhaar number (12 digits) *"
          keyboardType="number-pad"
          maxLength={12}
        />
        <Field
          value={emergency}
          onChangeText={setEmergency}
          placeholder="Emergency phone *"
          keyboardType="phone-pad"
        />
        <Text style={{ backgroundColor: colors.warningBg, padding: 12, borderRadius: 8, marginBottom: 12 }}>
          Live photo is captured after OTP. Used for face recognition after legal approval.
        </Text>
        <Field value={password} onChangeText={setPassword} placeholder="Password *" secureTextEntry />
        <Field value={confirm} onChangeText={setConfirm} placeholder="Confirm password *" secureTextEntry />
        <PrimaryButton
          label={consent ? '✓ Reunification consent given' : 'Tap to agree reunification consent'}
          tone={consent ? 'amber' : 'outline'}
          onPress={() => setConsent((v) => !v)}
        />
        <ErrorText message={error} />
        <PrimaryButton label={loading ? '…' : 'Submit'} onPress={submit} disabled={loading} />
      </ScrollView>
    </Screen>
  );
}

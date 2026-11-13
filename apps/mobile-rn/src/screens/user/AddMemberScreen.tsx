import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMember'>;

function Label({ children }: { children: string }) {
  return <Text style={{ color: colors.muted, marginBottom: 6, marginTop: 4 }}>{children}</Text>;
}

export function AddMemberScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [emergency, setEmergency] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const digits = aadhaar.replace(/\D/g, '');
    const ownPhone = phone.replace(/\D/g, '');
    const emergencyPhone = emergency.replace(/\D/g, '');

    if (!name.trim()) {
      setError(t(I18N_KEYS.errorNameRequired));
      return;
    }
    if (!address.trim()) {
      setError(t(I18N_KEYS.errorAddressRequired));
      return;
    }
    if (!emergencyPhone || emergencyPhone.length < 10) {
      setError(t(I18N_KEYS.errorEmergencyPhone));
      return;
    }
    if (ownPhone && ownPhone.length < 10) {
      setError(t(I18N_KEYS.errorOwnPhone));
      return;
    }
    if (digits && digits.length !== 12) {
      setError(t(I18N_KEYS.errorAadhaar));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/members', {
        name: name.trim(),
        ageBand: 'CHILD_6_8',
        address: address.trim(),
        ownPhone: ownPhone || undefined,
        emergencyPhone,
        aadhaarNumber: digits.length === 12 ? digits : undefined,
        minorGuardianConsent: true,
        photoKey: `photos/member-${Date.now()}.jpg`,
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Title>{t(I18N_KEYS.addMemberTitle)}</Title>
        <View>
          <Label>{t(I18N_KEYS.fieldNameRequired)}</Label>
          <Field value={name} onChangeText={setName} placeholder={t(I18N_KEYS.placeholderFullName)} />
          <Label>{t(I18N_KEYS.fieldOwnPhoneOptional)}</Label>
          <Field
            value={phone}
            onChangeText={setPhone}
            placeholder={t(I18N_KEYS.placeholderMobile10)}
            keyboardType="phone-pad"
          />
          <Label>{t(I18N_KEYS.fieldAddressRequired)}</Label>
          <Field
            value={address}
            onChangeText={setAddress}
            placeholder={t(I18N_KEYS.placeholderVillageCity)}
          />
          <Label>{t(I18N_KEYS.fieldAadhaarOptionalChild)}</Label>
          <Field
            value={aadhaar}
            onChangeText={setAadhaar}
            placeholder={t(I18N_KEYS.placeholderAadhaar12)}
            keyboardType="number-pad"
            maxLength={12}
          />
          <Label>{t(I18N_KEYS.fieldEmergencyPhoneRequired)}</Label>
          <Field
            value={emergency}
            onChangeText={setEmergency}
            placeholder={t(I18N_KEYS.placeholderMobile10)}
            keyboardType="phone-pad"
          />
        </View>
        <ErrorText message={error} />
        <PrimaryButton
          label={loading ? '…' : t(I18N_KEYS.actionAddMember)}
          onPress={save}
          disabled={loading}
        />
      </ScrollView>
    </Screen>
  );
}

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth';
import { I18N_KEYS, useI18n } from '../i18n';
import { colors } from '../theme';
import { BrandLogo, ErrorText, Field, PrimaryButton, Screen } from '../ui';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { lang, setLang, t, languages, labels } = useI18n();
  const { width } = useWindowDimensions();
  const [uid, setUid] = useState('K7M2-01');
  const [password, setPassword] = useState('pilgrim123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    setLoading(true);
    setError(null);
    try {
      await login(uid.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const logoWidth = Math.min(width - 64, 260);

  return (
    <Screen style={{ backgroundColor: colors.cream, paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 28, width: '100%' }}>
          <BrandLogo width={logoWidth} />
        </View>
        <Text style={{ textAlign: 'center', color: colors.muted, marginBottom: 12 }}>
          {t(I18N_KEYS.tagline)}
        </Text>
        <Field
          value={uid}
          onChangeText={setUid}
          placeholder={t(I18N_KEYS.fieldUniqueId)}
          autoCapitalize="characters"
        />
        <Field
          value={password}
          onChangeText={setPassword}
          placeholder={t(I18N_KEYS.fieldPassword)}
          secureTextEntry
        />
        <ErrorText message={error} />
        <PrimaryButton
          label={loading ? '…' : t(I18N_KEYS.actionLogin)}
          onPress={onLogin}
          disabled={loading}
        />
        <PrimaryButton
          label={t(I18N_KEYS.actionCreateAccount)}
          tone="outline"
          onPress={() => navigation.navigate('Register')}
        />
        <PrimaryButton
          label="Volunteer login"
          tone="outline"
          onPress={() => navigation.navigate('VolunteerLogin')}
        />
        <PrimaryButton
          label="Police / booth login"
          tone="outline"
          onPress={() => navigation.navigate('PoliceLogin')}
        />
        <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 8, fontSize: 12 }}>
          Family uses Unique ID above. Staff use Volunteer or Police login.
        </Text>
        <Text style={{ textAlign: 'center', marginTop: 20, fontWeight: '700' }}>
          {t(I18N_KEYS.profileLanguage)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          {languages.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: lang === code ? colors.amber : colors.white,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text>{labels[code]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

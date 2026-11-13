import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

export function ProfileTab() {
  const { uid, logout } = useAuth();
  const { lang, setLang, t, languages, labels } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <Title>{uid ?? t(I18N_KEYS.tabProfile)}</Title>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{t(I18N_KEYS.homeFamilyAccount)}</Text>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>{t(I18N_KEYS.profileLanguage)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
      <PrimaryButton
        label={t(I18N_KEYS.profileWristbandQr)}
        tone="outline"
        onPress={() => uid && navigation.navigate('WristbandQr', { uid })}
      />
      <PrimaryButton
        label={t(I18N_KEYS.actionLogout)}
        tone="alert"
        onPress={async () => {
          await logout();
        }}
      />
    </Screen>
  );
}

import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { localizedBoothName } from '../../boothName';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { Loading, Screen, Title } from '../../ui';

type Booth = {
  id: string;
  code: string;
  name: string;
  nameI18n?: Partial<Record<'en' | 'hi' | 'te' | 'ta', string>> | null;
  officerName: string | null;
  location: { lat: number; lng: number } | null;
};

export function BoothsTab() {
  const { lang, t } = useI18n();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);

  async function openBoothDirections(booth: Booth) {
    if (!booth.location) {
      Alert.alert(t(I18N_KEYS.boothsNoLocationTitle), t(I18N_KEYS.boothsNoLocationBody));
      return;
    }
    const { lat, lng } = booth.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert(t(I18N_KEYS.boothsMapsUnavailableTitle), t(I18N_KEYS.boothsMapsUnavailableBody));
      return;
    }
    await Linking.openURL(url);
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          setBooths(await api.get('/booths'));
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  if (loading) return <Loading />;

  return (
    <Screen>
      <Title>{t(I18N_KEYS.tabBooths)}</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{t(I18N_KEYS.boothsTapNavigate)}</Text>
      <FlatList
        data={booths}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void openBoothDirections(item)}
            style={{
              backgroundColor: colors.white,
              padding: 14,
              borderRadius: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: '700' }}>
              {item.code} · {localizedBoothName(item, lang)}
            </Text>
            <Text style={{ color: colors.muted }}>
              {t(I18N_KEYS.boothsOfficer)}: {item.officerName ?? '—'}
            </Text>
            <Text style={{ color: colors.navy, marginTop: 6, fontWeight: '600' }}>
              {item.location ? t(I18N_KEYS.boothsNavigate) : t(I18N_KEYS.boothsNoLocation)}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

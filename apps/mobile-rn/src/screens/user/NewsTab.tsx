import React, { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { Loading, Screen, Title } from '../../ui';

type Notice = {
  id: string;
  title?: Partial<Record<'en' | 'te' | 'hi' | 'ta', string>>;
  body?: Partial<Record<'en' | 'te' | 'hi' | 'ta', string>>;
  severity?: string;
};

export function NewsTab() {
  const { lang, t } = useI18n();
  const [items, setItems] = useState<Notice[]>([]);
  const [cases, setCases] = useState<Array<{ id: string; memberUid: string; status: string; lastSeenLabel?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const [n, c] = await Promise.all([
            api.get<Notice[]>('/notices'),
            api.get<typeof cases>('/cases/mine').catch(() => []),
          ]);
          setItems(n);
          setCases(c);
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  if (loading) return <Loading />;

  const alerts = cases.filter((c) => c.status === 'FOUND' || c.status === 'MATCHED');

  return (
    <Screen>
      <Title>{t(I18N_KEYS.tabNews)}</Title>
      {alerts.map((a) => (
        <View
          key={a.id}
          style={{
            backgroundColor: colors.warningBg,
            padding: 14,
            borderRadius: 8,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: '700', color: '#9A6700' }}>
            {a.status === 'MATCHED' ? t(I18N_KEYS.newsAtBooth) : t(I18N_KEYS.newsFound)}: {a.memberUid}
          </Text>
          <Text>
            {a.status === 'MATCHED' ? t(I18N_KEYS.newsMatchedHint) : t(I18N_KEYS.newsFoundHint)}{' '}
            {a.lastSeenLabel ?? ''}
          </Text>
          <Text style={{ marginTop: 6, fontWeight: '700', color: '#9A6700' }}>
            {t(I18N_KEYS.newsAction)}
          </Text>
        </View>
      ))}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.white, padding: 14, borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700' }}>
              {item.title?.[lang] ?? item.title?.en ?? t(I18N_KEYS.newsNotice)}
            </Text>
            <Text style={{ color: colors.muted }}>
              {item.body?.[lang] ?? item.body?.en ?? item.severity}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

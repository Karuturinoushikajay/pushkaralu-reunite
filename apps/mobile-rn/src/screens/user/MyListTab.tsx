import React, { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { I18N_KEYS, useI18n } from '../../i18n';
import { caseStatusColors, caseStatusLabelI18n, colors } from '../../theme';
import { Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

const BOOTH = { lat: 16.9846, lng: 81.7795 };

function openBoothMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
    return;
  }
  void Linking.openURL(url);
}

type Member = {
  uid: string;
  name: string | null;
  ageBand: string | null;
  caseStatus: string | null;
  caseId: string | null;
  isSelf?: boolean;
};

export function MyListTab() {
  const { uid } = useAuth();
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await api.get<Member[]>('/members'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && !members.length) return <Loading />;

  return (
    <Screen>
      <Title>{t(I18N_KEYS.tabMyList)}</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{t(I18N_KEYS.myListTapHint)}</Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.uid}
        renderItem={({ item }) => {
          const tone = caseStatusColors(item.caseStatus);
          return (
          <Pressable
            onPress={() => {
              if (item.caseStatus === 'FOUND') {
                openBoothMaps(BOOTH.lat, BOOTH.lng);
                return;
              }
              if (item.caseId && item.caseStatus && item.caseStatus !== 'REUNITED') {
                navigation.navigate('CaseDetail', { caseId: item.caseId });
              } else {
                navigation.navigate('MemberDetail', { uid: item.uid });
              }
            }}
            style={{
              backgroundColor: tone.bg,
              padding: 14,
              borderRadius: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: '700', color: tone.fg }}>
              {item.isSelf ? `${t(I18N_KEYS.myListSelf)}  ` : ''}
              {item.uid}
            </Text>
            <Text style={{ color: tone.fg }}>
              {item.name} — {caseStatusLabelI18n(item.caseStatus, t)}
            </Text>
          </Pressable>
          );
        }}
      />
      <PrimaryButton
        label={t(I18N_KEYS.actionAddMember)}
        tone="outline"
        onPress={() => navigation.navigate('AddMember')}
      />
      <PrimaryButton
        label={t(I18N_KEYS.actionShowQr)}
        tone="amber"
        onPress={() => uid && navigation.navigate('WristbandQr', { uid })}
      />
    </Screen>
  );
}

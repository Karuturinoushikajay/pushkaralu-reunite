import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { caseStatusColors, caseStatusLabelI18n, colors } from '../../theme';
import { Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Member = {
  uid: string;
  name: string | null;
  caseStatus: string | null;
  caseId: string | null;
  isSelf?: boolean;
};

type Booth = {
  code: string;
  location: { lat: number; lng: number } | null;
};

const POLL_MS = 5_000;
const DEFAULT_BOOTH = { lat: 16.9846, lng: 81.7795 };

async function dial(number: string) {
  await Linking.openURL(`tel:${number}`);
}

async function openMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  // Web: new tab (Linking alone often stays in-app / fails silently on phone browsers)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
    return;
  }
  await Linking.openURL(url);
}

export function HomeTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { lang, t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const boothRef = useRef<{ lat: number; lng: number }>(DEFAULT_BOOTH);

  const loadMembers = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const m = await api.get<Member[]>('/members');
      setMembers(m);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, n, booths] = await Promise.all([
        api.get<Member[]>('/members'),
        api.get<Array<{ title?: Record<string, string> }>>('/notices'),
        api.get<Booth[]>('/booths').catch(() => [] as Booth[]),
      ]);
      setMembers(m);
      const title = n[0]?.title;
      setNotice(title?.[lang] ?? title?.en ?? title?.te ?? title?.hi ?? '');
      const preferred =
        booths.find((b) => b.code === 'BOOTH-07' && b.location) ??
        booths.find((b) => b.location) ??
        null;
      if (preferred?.location) {
        boothRef.current = preferred.location;
      }
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(() => {
        void loadMembers(false);
      }, POLL_MS);
      return () => clearInterval(id);
    }, [load, loadMembers]),
  );

  async function onMemberPress(item: Member) {
    const status = item.caseStatus;

    // FOUND → open maps to booth immediately (never MemberDetail / report missing)
    if (status === 'FOUND') {
      const fallback = boothRef.current;
      try {
        // Open maps first so the tap always does something visible.
        await openMaps(fallback.lat, fallback.lng);
        if (item.caseId) {
          const detail = await api.get<{
            nearestBooth?: { location?: { lat: number; lng: number } | null };
          }>(`/cases/${item.caseId}`);
          const loc = detail.nearestBooth?.location;
          if (loc && (loc.lat !== fallback.lat || loc.lng !== fallback.lng)) {
            await openMaps(loc.lat, loc.lng);
          }
        }
      } catch {
        Alert.alert('Maps', 'Could not open booth directions. Allow pop-ups if on web.');
      }
      return;
    }

    // MATCHED → booth OTP / collection screen
    if (status === 'MATCHED' && item.caseId) {
      navigation.navigate('CaseDetail', { caseId: item.caseId });
      return;
    }

    // MISSING open case → case status screen (not report again)
    if (status === 'MISSING' && item.caseId) {
      navigation.navigate('CaseDetail', { caseId: item.caseId });
      return;
    }

    navigation.navigate('MemberDetail', { uid: item.uid });
  }

  if (loading && members.length === 0) return <Loading />;

  return (
    <Screen>
      <Title>{t(I18N_KEYS.homeLocation)}</Title>
      <View style={{ backgroundColor: colors.warningBg, padding: 16, borderRadius: 12, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700' }}>{t(I18N_KEYS.homeHelpline)}: 1800-200-7027</Text>
        {notice ? <Text style={{ marginTop: 8 }}>{notice}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Pressable
          onPress={() => void dial('100')}
          style={{
            flex: 1,
            backgroundColor: colors.alert,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '800' }}>{t(I18N_KEYS.homeSosPolice)}</Text>
          <Text style={{ color: colors.white, fontSize: 12, marginTop: 2 }}>100</Text>
        </Pressable>
        <Pressable
          onPress={() => void dial('108')}
          style={{
            flex: 1,
            backgroundColor: colors.navy,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '800' }}>{t(I18N_KEYS.homeSosMedical)}</Text>
          <Text style={{ color: colors.white, fontSize: 12, marginTop: 2 }}>108</Text>
        </Pressable>
      </View>

      <PrimaryButton
        label={t(I18N_KEYS.homeOfflineMaps)}
        tone="outline"
        onPress={() => navigation.navigate('MapDownload')}
      />

      {members.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 16, marginBottom: 16 }}>{t(I18N_KEYS.emptyNoMembersTitle)}</Text>
          <PrimaryButton
            label={t(I18N_KEYS.emptyNoMembersAction)}
            tone="amber"
            onPress={() => navigation.navigate('AddMember')}
          />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => {
            const tone = caseStatusColors(item.caseStatus);
            const isFound = item.caseStatus === 'FOUND';
            return (
              <Pressable
                onPress={() => void onMemberPress(item)}
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
                  {item.name} · {item.uid}
                </Text>
                <Text style={{ color: tone.fg, fontWeight: isFound ? '800' : '400' }}>
                  {caseStatusLabelI18n(item.caseStatus, t)}
                </Text>
                {isFound ? (
                  <Text style={{ color: tone.fg, marginTop: 6, fontWeight: '700' }}>
                    {t(I18N_KEYS.homeTapNavigateBooth)}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { localizedBoothName } from '../../boothName';
import { I18N_KEYS, useI18n } from '../../i18n';
import { caseStatusColors, caseStatusLabelI18n, colors } from '../../theme';
import { Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

const DEFAULT_BOOTH = { lat: 16.9846, lng: 81.7795 };

type CaseDetail = {
  id: string;
  memberUid: string;
  status: string;
  lastSeenLabel: string | null;
  nearestBooth?: {
    code: string;
    name: string;
    nameI18n?: Partial<Record<'en' | 'hi' | 'te' | 'ta', string>> | null;
    officerName: string | null;
    distanceMeters: number;
    location?: { lat: number; lng: number } | null;
  };
};

async function openBoothMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
    return;
  }
  await Linking.openURL(url);
}

export function CaseDetailScreen({ route }: Props) {
  const { caseId } = route.params;
  const { lang, t } = useI18n();
  const [detail, setDetail] = useState<CaseDetail | null>(null);

  const load = useCallback(async () => {
    setDetail(await api.get<CaseDetail>(`/cases/${caseId}`));
  }, [caseId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!detail) return <Loading />;

  const tone = caseStatusColors(detail.status);
  const atBooth = detail.status === 'MATCHED';
  const awaitingBooth = detail.status === 'FOUND';
  const reunited = detail.status === 'REUNITED';
  const isMissing = detail.status === 'MISSING';
  const showNavigate = awaitingBooth || atBooth;

  async function navigateToBooth() {
    const loc = detail?.nearestBooth?.location;
    const lat = loc?.lat ?? DEFAULT_BOOTH.lat;
    const lng = loc?.lng ?? DEFAULT_BOOTH.lng;
    await openBoothMaps(lat, lng);
  }

  return (
    <Screen>
      <Title>{t(I18N_KEYS.caseBoothCollection)}</Title>
      <View
        style={{
          backgroundColor: tone.bg,
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: '700', fontSize: 18, color: tone.fg }}>{detail.memberUid}</Text>
        <Text style={{ color: tone.fg, fontWeight: '700', marginTop: 6 }}>
          {caseStatusLabelI18n(detail.status, t)}
        </Text>
        <Text style={{ marginTop: 6 }}>
          {detail.lastSeenLabel ?? t(I18N_KEYS.caseLastSeenNearGhat)}
        </Text>
      </View>

      {detail.nearestBooth ? (
        <>
          <Text style={{ fontWeight: '700' }}>
            {detail.nearestBooth.code}, {localizedBoothName(detail.nearestBooth, lang)}
          </Text>
          <Text>
            {t(I18N_KEYS.caseOfficer)}: {detail.nearestBooth.officerName ?? '—'}
          </Text>
          <Text>
            {detail.nearestBooth.distanceMeters} {t(I18N_KEYS.caseWalkMeters)}
          </Text>
        </>
      ) : (
        <Text>{t(I18N_KEYS.caseDefaultBooth)}</Text>
      )}

      {isMissing ? (
        <Text style={{ marginTop: 16, color: colors.alert, fontWeight: '700' }}>
          {t(I18N_KEYS.caseStillMissing)}
        </Text>
      ) : null}

      {awaitingBooth || atBooth ? (
        <Text style={{ marginTop: 16, color: '#9A6700', fontWeight: '700' }}>
          {t(I18N_KEYS.caseFoundGoBooth)}
        </Text>
      ) : null}

      {reunited ? (
        <View
          style={{
            marginTop: 16,
            backgroundColor: colors.successBg,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: '800', color: colors.success }}>
            {t(I18N_KEYS.caseCollectedTitle)}
          </Text>
          <Text style={{ color: colors.success, marginTop: 4 }}>
            {t(I18N_KEYS.caseCollectedBody)}
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        label={t(I18N_KEYS.actionNavigateToBooth)}
        tone={showNavigate ? 'amber' : 'outline'}
        onPress={() => void navigateToBooth()}
      />
    </Screen>
  );
}

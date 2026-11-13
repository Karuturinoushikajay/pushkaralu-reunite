import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { localizedBoothName } from '../../boothName';
import { I18N_KEYS, useI18n } from '../../i18n';
import { caseStatusColors, caseStatusLabelI18n, colors } from '../../theme';
import { ErrorText, Field, Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

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

export function CaseDetailScreen({ route }: Props) {
  const { caseId } = route.params;
  const { lang, t } = useI18n();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [otp, setOtp] = useState('');
  const [handoverId, setHandoverId] = useState<string | undefined>();
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const canCollect = detail.status === 'MATCHED';
  const awaitingBooth = detail.status === 'FOUND';
  const reunited = detail.status === 'REUNITED';
  const isMissing = detail.status === 'MISSING';

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        handoverId: string;
        maskedPhone: string;
        debugCode?: string;
      }>(`/cases/${caseId}/handover/start`, {});
      setHandoverId(res.handoverId);
      setMaskedPhone(res.maskedPhone);
      setDebugCode(res.debugCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(I18N_KEYS.stateErrorGeneric));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<CaseDetail>(`/cases/${caseId}/handover/verify`, {
        code: otp.trim(),
        handoverId,
      });
      setDetail(updated);
      setOtp('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t(I18N_KEYS.stateErrorGeneric));
    } finally {
      setBusy(false);
    }
  }

  async function navigateToBooth() {
    const loc = detail?.nearestBooth?.location;
    if (!loc) return;
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`);
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

      {awaitingBooth ? (
        <Text style={{ marginTop: 16, color: '#9A6700', fontWeight: '700' }}>
          {t(I18N_KEYS.caseFoundGoBooth)}
        </Text>
      ) : null}

      {canCollect ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8, color: '#9A6700' }}>
            {t(I18N_KEYS.caseCollectOtpTitle)}
          </Text>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            {t(I18N_KEYS.caseCollectOtpHint)}
          </Text>
          <PrimaryButton
            label={busy ? '…' : handoverId ? t(I18N_KEYS.caseResendOtp) : t(I18N_KEYS.caseSendOtp)}
            tone="amber"
            disabled={busy}
            onPress={() => void sendOtp()}
          />
          {maskedPhone ? (
            <Text style={{ marginTop: 8, color: colors.muted }}>
              {t(I18N_KEYS.caseSentTo)} {maskedPhone}
            </Text>
          ) : null}
          {debugCode ? (
            <Text style={{ marginTop: 4, color: colors.navy }}>Dev OTP: {debugCode}</Text>
          ) : null}
          {handoverId ? (
            <>
              <Field
                value={otp}
                onChangeText={setOtp}
                placeholder={t(I18N_KEYS.caseOtpPlaceholder)}
                keyboardType="number-pad"
                maxLength={6}
              />
              <PrimaryButton
                label={busy ? '…' : t(I18N_KEYS.caseVerifyOtp)}
                tone="amber"
                disabled={busy || otp.trim().length !== 6}
                onPress={() => void verifyOtp()}
              />
            </>
          ) : null}
          <ErrorText message={error} />
        </View>
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
        tone="outline"
        onPress={() => void navigateToBooth()}
      />
    </Screen>
  );
}

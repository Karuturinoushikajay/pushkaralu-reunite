import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { caseStatusColors, caseStatusLabel, colors } from '../../theme';
import { ErrorText, Field, Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PoliceCaseDetail'>;

type CaseDetail = {
  id: string;
  memberUid: string;
  status: string;
  name?: string | null;
  lastSeenLabel: string | null;
  note?: string | null;
};

export function PoliceCaseDetailScreen({ route, navigation }: Props) {
  const { caseId } = route.params;
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [otp, setOtp] = useState('');
  const [handoverId, setHandoverId] = useState<string | undefined>();
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [reason, setReason] = useState('OTP / signal unavailable');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [officerNote, setOfficerNote] = useState('');
  const [idVerified, setIdVerified] = useState(true);

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

  async function alertVolunteers() {
    setBusy(true);
    setError(null);
    setAlertMsg(null);
    try {
      const res = await api.post<{ volunteersAlerted: number }>(
        `/cases/${caseId}/alert-volunteers`,
        {},
      );
      setAlertMsg(`Alerted ${res.volunteersAlerted} volunteers`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alert failed');
    } finally {
      setBusy(false);
    }
  }

  async function markFound() {
    setBusy(true);
    setError(null);
    try {
      setDetail(await api.post<CaseDetail>(`/cases/${caseId}/mark-found`, {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mark found failed');
    } finally {
      setBusy(false);
    }
  }

  async function boothMatched() {
    setBusy(true);
    setError(null);
    try {
      setDetail(
        await api.post<CaseDetail>(`/cases/${caseId}/handover/booth-success`, {
          note: 'At booth — ready for family OTP',
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booth match failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ handoverId: string; debugCode?: string }>(
        `/cases/${caseId}/handover/start`,
        {},
      );
      setHandoverId(res.handoverId);
      setDebugCode(res.debugCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    try {
      setDetail(
        await api.post<CaseDetail>(`/cases/${caseId}/handover/verify`, {
          code: otp.trim(),
          handoverId,
        }),
      );
      setOtp('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OTP failed');
    } finally {
      setBusy(false);
    }
  }

  async function manualClose() {
    setBusy(true);
    setError(null);
    try {
      setDetail(
        await api.post<CaseDetail>(`/cases/${caseId}/handover/manual-close`, {
          reason: reason.trim() || 'OTP / signal unavailable',
          idVerified,
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
          officerNote: officerNote.trim() || undefined,
        }),
      );
      setShowManual(false);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Manual close failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Title>Police case</Title>
        <View
          style={{
            backgroundColor: tone.bg,
            padding: 14,
            borderRadius: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: '800', color: tone.fg, fontSize: 18 }}>
            {detail.name ?? detail.memberUid}
          </Text>
          <Text style={{ fontWeight: '700', color: tone.fg }}>ID: {detail.memberUid}</Text>
          <Text style={{ color: tone.fg, marginTop: 6 }}>{caseStatusLabel(detail.status)}</Text>
          <Text style={{ marginTop: 6 }}>{detail.lastSeenLabel ?? detail.note ?? ''}</Text>
        </View>

        <ErrorText message={error} />
        {alertMsg ? (
          <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 8 }}>{alertMsg}</Text>
        ) : null}

        {detail.status === 'MISSING' ? (
          <>
            <PrimaryButton
              label={busy ? '…' : 'Alert volunteers nearby'}
              tone="alert"
              disabled={busy}
              onPress={() => void alertVolunteers()}
            />
            <PrimaryButton
              label={busy ? '…' : 'Mark FOUND (yellow)'}
              tone="amber"
              disabled={busy}
              onPress={() => void markFound()}
            />
          </>
        ) : null}

        {detail.status === 'FOUND' ? (
          <PrimaryButton
            label={busy ? '…' : 'Confirm at booth → MATCHED'}
            tone="amber"
            disabled={busy}
            onPress={() => void boothMatched()}
          />
        ) : null}

        {detail.status === 'MATCHED' ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8, color: '#9A6700' }}>
              Family collection OTP (required)
            </Text>
            <PrimaryButton
              label={busy ? '…' : handoverId ? 'Resend OTP' : 'Send collection OTP'}
              tone="amber"
              disabled={busy}
              onPress={() => void sendOtp()}
            />
            {debugCode ? <Text style={{ marginTop: 6 }}>Dev OTP: {debugCode}</Text> : null}
            {handoverId ? (
              <>
                <Field
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <PrimaryButton
                  label={busy ? '…' : 'Verify OTP → REUNITED (green)'}
                  disabled={busy || otp.trim().length !== 6}
                  onPress={() => void verifyOtp()}
                />
              </>
            ) : null}

            <Text style={{ marginTop: 16, marginBottom: 8, color: colors.muted }}>
              No signal / OTP not received? Close manually (audited).
            </Text>
            <PrimaryButton
              label={showManual ? 'Hide manual close' : 'Close without OTP (manual)'}
              tone="outline"
              disabled={busy}
              onPress={() => setShowManual((v) => !v)}
            />
            {showManual ? (
              <View style={{ marginTop: 8 }}>
                <Field
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason (e.g. no network / OTP)"
                />
                <Field
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="Guardian name"
                />
                <Field
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  placeholder="Guardian phone (+91…)"
                  keyboardType="phone-pad"
                />
                <Field
                  value={officerNote}
                  onChangeText={setOfficerNote}
                  placeholder="Officer note (optional)"
                />
                <Pressable
                  onPress={() => setIdVerified((v) => !v)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.white,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>
                    ID verified: {idVerified ? 'Yes' : 'No'} (tap to toggle)
                  </Text>
                </Pressable>
                <PrimaryButton
                  label={busy ? '…' : 'Confirm manual close → REUNITED'}
                  tone="alert"
                  disabled={busy || !guardianName.trim() || guardianPhone.trim().length < 10}
                  onPress={() => void manualClose()}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {detail.status === 'REUNITED' ? (
          <View
            style={{
              backgroundColor: colors.successBg,
              padding: 14,
              borderRadius: 12,
              marginTop: 8,
            }}
          >
            <Text style={{ fontWeight: '800', color: colors.success }}>
              Reunited — case closed
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

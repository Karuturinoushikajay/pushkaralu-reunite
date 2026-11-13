import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api';
import { caseStatusColors, caseStatusLabel, colors } from '../../theme';
import { ErrorText, Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type CaseRow = {
  id: string;
  memberUid: string;
  name?: string | null;
  status: string;
  lastSeenLabel: string | null;
  ageBand?: string | null;
};

type Notice = { id: string; title?: { en?: string }; body?: { en?: string } };

export function PoliceAlertsTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [missing, setMissing] = useState<CaseRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cases, n] = await Promise.all([
        api.get<CaseRow[]>('/cases'),
        api.get<Notice[]>('/notices').catch(() => [] as Notice[]),
      ]);
      setMissing(cases.filter((c) => c.status === 'MISSING'));
      setNotices(n);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function alertVolunteers(caseId: string) {
    setBusyId(caseId);
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{ volunteersAlerted: number }>(`/cases/${caseId}/alert-volunteers`, {});
      setMsg(`Alerted ${res.volunteersAlerted} volunteers`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alert failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading />;

  const tone = caseStatusColors('MISSING');

  return (
    <Screen>
      <Title>Alerts</Title>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        Live MISSING · auto sound on new reports · or tap to notify volunteers
      </Text>
      <ErrorText message={error} />
      {msg ? <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 8 }}>{msg}</Text> : null}

      <FlatList
        data={missing}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <Text style={{ color: colors.muted, marginBottom: 16 }}>No open MISSING cases</Text>
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Booth notices</Text>
            {notices.length === 0 ? (
              <Text style={{ color: colors.muted }}>No notices</Text>
            ) : (
              notices.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: colors.white,
                    padding: 14,
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>{item.title?.en ?? 'Notice'}</Text>
                  <Text style={{ color: colors.muted }}>{item.body?.en ?? ''}</Text>
                </View>
              ))
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: tone.bg,
              padding: 14,
              borderRadius: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Pressable onPress={() => navigation.navigate('PoliceCaseDetail', { caseId: item.id })}>
              <Text style={{ fontWeight: '800', color: tone.fg }}>
                {item.name ?? item.memberUid}
              </Text>
              <Text style={{ fontWeight: '700', color: tone.fg }}>ID: {item.memberUid}</Text>
              <Text style={{ color: tone.fg, marginTop: 4 }}>{caseStatusLabel(item.status)}</Text>
              <Text style={{ marginTop: 4 }}>
                {[item.ageBand, item.lastSeenLabel].filter(Boolean).join(' · ') || 'Last seen near ghat'}
              </Text>
            </Pressable>
            <PrimaryButton
              label={busyId === item.id ? '…' : 'Alert volunteers nearby'}
              tone="alert"
              disabled={busyId !== null}
              onPress={() => void alertVolunteers(item.id)}
            />
          </View>
        )}
      />
    </Screen>
  );
}

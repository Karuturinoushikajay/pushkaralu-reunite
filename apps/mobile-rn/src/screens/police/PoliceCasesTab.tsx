import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api';
import { caseStatusColors, colors } from '../../theme';
import { Field, Loading, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type CaseRow = {
  id: string;
  memberUid: string;
  name?: string | null;
  status: string;
  lastSeenLabel: string | null;
  ageBand?: string | null;
};

export function PoliceCasesTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<'All' | 'Missing' | 'Found'>('All');
  const [query, setQuery] = useState('');
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<CaseRow[]>('/cases');
      if (filter === 'Missing') {
        setCases(rows.filter((c) => c.status === 'MISSING'));
      } else if (filter === 'Found') {
        setCases(rows.filter((c) => c.status === 'FOUND' || c.status === 'MATCHED'));
      } else {
        setCases(rows.filter((c) => c.status !== 'REUNITED'));
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const uid = c.memberUid.toLowerCase();
      return name.includes(q) || uid.includes(q);
    });
  }, [cases, query]);

  return (
    <Screen>
      <Title>Open cases · Booth 07</Title>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['All', 'Missing', 'Found'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: filter === f ? colors.amber : colors.white,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text>{f}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or ID"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(
          [
            { label: '+ Register case', go: () => navigation.navigate('PoliceRegisterCase'), on: true },
            { label: 'Scan QR', go: () => navigation.navigate('ScanQr'), on: false },
          ] as const
        ).map((a) => (
          <Pressable
            key={a.label}
            onPress={a.go}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: a.on ? colors.amber : colors.white,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: '600' }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={<Text style={{ color: colors.muted }}>No cases in this filter</Text>}
          renderItem={({ item }) => {
            const tone = caseStatusColors(item.status);
            return (
              <Pressable
                onPress={() => navigation.navigate('PoliceCaseDetail', { caseId: item.id })}
                style={{
                  backgroundColor: tone.bg,
                  padding: 14,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontWeight: '800', color: tone.fg }}>
                  {item.name ?? item.memberUid}
                </Text>
                <Text style={{ fontWeight: '700', color: tone.fg }}>ID: {item.memberUid}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

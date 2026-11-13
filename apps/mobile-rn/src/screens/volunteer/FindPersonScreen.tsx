import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { colors } from '../../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FindPerson'>;
type Hit = {
  uid: string;
  familyCode: string;
  name: string;
  caseStatus: string | null;
  faceMatchScore?: number;
};

const modes = [
  { id: 'name', label: 'Name' },
  { id: 'familyId', label: 'Family ID' },
  { id: 'aadhaar', label: 'Aadhaar' },
  { id: 'photo', label: 'Photo' },
] as const;

export function FindPersonScreen({ navigation }: Props) {
  const [mode, setMode] = useState<(typeof modes)[number]['id']>('name');
  const [name, setName] = useState('');
  const [familyId, setFamilyId] = useState('K7M2');
  const [aadhaar, setAadhaar] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [faceDisabled, setFaceDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    setFaceDisabled(false);
    try {
      const body: Record<string, string> = { mode };
      if (mode === 'name') body.name = name.trim();
      if (mode === 'familyId') body.familyId = familyId.trim().toUpperCase();
      if (mode === 'aadhaar') body.aadhaarNumber = aadhaar.replace(/\D/g, '');
      if (mode === 'photo') body.photoKey = `photos/search-${Date.now()}.jpg`;
      const res = await api.post<{ faceMatchDisabled: boolean; results: Hit[] }>('/search/pilgrims', body);
      setFaceDisabled(res.faceMatchDisabled);
      setResults(res.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Title>Register case</Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {modes.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: mode === m.id ? colors.amber : colors.white,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'name' ? <Field value={name} onChangeText={setName} placeholder="Name" /> : null}
        {mode === 'familyId' ? (
          <Field value={familyId} onChangeText={setFamilyId} placeholder="Family ID (K7M2)" autoCapitalize="characters" />
        ) : null}
        {mode === 'aadhaar' ? (
          <Field value={aadhaar} onChangeText={setAadhaar} placeholder="Aadhaar" keyboardType="number-pad" maxLength={12} />
        ) : null}
        {mode === 'photo' ? (
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            Take a picture; app lists likely face matches (flagged; default off).
          </Text>
        ) : null}
        <PrimaryButton label={loading ? '…' : 'Search'} onPress={search} disabled={loading} />
        <PrimaryButton label="Scan QR" tone="outline" onPress={() => navigation.navigate('ScanQr')} />
        {faceDisabled ? (
          <Text style={{ color: colors.alert, marginTop: 8 }}>
            Face matching is off until legal approval. Use name / family ID / Aadhaar / QR.
          </Text>
        ) : null}
        <ErrorText message={error} />
        {results.map((r) => (
          <Pressable
            key={r.uid}
            onPress={() => navigation.navigate('FamilyCall', { hit: r })}
            style={{ backgroundColor: colors.white, padding: 14, borderRadius: 8, marginTop: 8 }}
          >
            <Text style={{ fontWeight: '700' }}>
              {r.name} · {r.uid}
            </Text>
            <Text>
              Family {r.familyCode}
              {r.faceMatchScore != null ? ` | Face ${r.faceMatchScore}%` : ''}
              {r.caseStatus ? ` | ${r.caseStatus}` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

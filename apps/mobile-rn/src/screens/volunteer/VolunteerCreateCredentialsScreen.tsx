import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { BrandLogo, ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VolunteerCreateCredentials'>;

type BoothOpt = { code: string; name: string; officerName: string | null };

export function VolunteerCreateCredentialsScreen({ navigation }: Props) {
  const { saveSession } = useAuth();
  const [booths, setBooths] = useState<BoothOpt[]>([]);
  const [boothCode, setBoothCode] = useState('BOOTH-07');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [volunteerCode, setVolunteerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api.get<BoothOpt[]>('/booths/directory');
        setBooths(rows);
        if (rows.length > 0) {
          setBoothCode((prev) => (rows.some((b) => b.code === prev) ? prev : rows[0]!.code));
        }
      } catch {
        setBooths([{ code: 'BOOTH-07', name: 'Kotilingala Ghat', officerName: null }]);
      }
    })();
  }, []);

  async function onCreate() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        phone: phone.trim(),
        boothCode: boothCode.trim().toUpperCase(),
      };
      if (volunteerCode.trim()) {
        body.volunteerCode = volunteerCode.trim().toUpperCase();
      }
      const res = await api.post<{
        uid: string;
        role: string;
        volunteerCode?: string;
        tokens: { accessToken: string };
      }>('/auth/volunteer/register', body);
      await saveSession(res.tokens.accessToken, res.uid, res.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create volunteer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <BrandLogo width={140} />
        <Title>Create volunteer credentials</Title>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>
          Pick your booth, enter name and phone. Leave Volunteer ID blank to auto-assign.
        </Text>

        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Allocated booth</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {booths.map((b) => (
            <Pressable
              key={b.code}
              onPress={() => setBoothCode(b.code)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: boothCode === b.code ? colors.amber : colors.white,
                borderWidth: 1,
                borderColor: colors.border,
                maxWidth: '100%',
              }}
            >
              <Text style={{ fontWeight: '700' }}>{b.code}</Text>
              <Text style={{ fontSize: 12 }}>{b.name}</Text>
            </Pressable>
          ))}
        </View>

        <Field value={name} onChangeText={setName} placeholder="Full name" />
        <Field
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone (+91…)"
          keyboardType="phone-pad"
        />
        <Field
          value={volunteerCode}
          onChangeText={setVolunteerCode}
          placeholder="Volunteer ID optional (VOL-0300)"
          autoCapitalize="characters"
        />
        <ErrorText message={error} />
        <PrimaryButton
          label={loading ? '…' : 'Create & login'}
          tone="amber"
          disabled={loading || !name.trim() || phone.trim().length < 10}
          onPress={() => void onCreate()}
        />
        <PrimaryButton
          label="Back to volunteer login"
          tone="outline"
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </Screen>
  );
}

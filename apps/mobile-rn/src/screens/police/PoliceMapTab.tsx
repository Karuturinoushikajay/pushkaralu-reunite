import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api';
import { caseStatusColors, caseStatusLabel, colors } from '../../theme';
import { Loading, Muted, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

const BOOTH_PINS = [
  {
    id: 'booth-07',
    title: 'BOOTH-07',
    description: 'Kotilingala Ghat',
    coordinate: { latitude: 16.9846, longitude: 81.7795 },
    pinColor: '#12263F',
  },
  {
    id: 'booth-03',
    title: 'BOOTH-03',
    description: 'Pushkar Ghat',
    coordinate: { latitude: 16.99, longitude: 81.776 },
    pinColor: '#0B3D2E',
  },
] as const;

const REGION = {
  latitude: 16.9873,
  longitude: 81.77775,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

type CaseRow = {
  id: string;
  memberUid: string;
  name?: string | null;
  status: string;
  lastSeenLabel: string | null;
  lastSeen: { lat: number; lng: number } | null;
};

function pinColorForStatus(status: string): string {
  if (status === 'MISSING') return '#B42318';
  if (status === 'FOUND' || status === 'MATCHED') return '#E8A33D';
  if (status === 'REUNITED') return '#1B7F4B';
  return '#5B6B7C';
}

function MapPanel({ cases }: { cases: CaseRow[] }) {
  const casePins = useMemo(
    () =>
      cases
        .filter((c) => c.lastSeen)
        .map((c) => ({
          id: c.id,
          title: c.memberUid,
          description: caseStatusLabel(c.status),
          coordinate: {
            latitude: c.lastSeen!.lat,
            longitude: c.lastSeen!.lng,
          },
          pinColor: pinColorForStatus(c.status),
        })),
    [cases],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.mapWrap, styles.mapFallback]}>
        <Text style={{ fontWeight: '700', color: colors.navy }}>Live map (open in Expo Go)</Text>
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>
          Native pins need Expo Go. Booths + case last-seen listed below.
        </Text>
        {BOOTH_PINS.map((p) => (
          <Text key={p.id} style={{ marginTop: 4 }}>
            {p.title} · {p.description}
          </Text>
        ))}
        {casePins.slice(0, 8).map((p) => (
          <Text key={p.id} style={{ marginTop: 4, color: p.pinColor }}>
            {p.title} · {p.description}
          </Text>
        ))}
      </View>
    );
  }

  // Lazy require so web bundles never load react-native-maps native specs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps') as typeof import('react-native-maps');
  const MapView = maps.default;
  const Marker = maps.Marker;
  const PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;

  return (
    <View style={styles.mapWrap}>
      <MapView style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={REGION}>
        {BOOTH_PINS.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={pin.coordinate}
            title={pin.title}
            description={pin.description}
            pinColor={pin.pinColor}
          />
        ))}
        {casePins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={pin.coordinate}
            title={pin.title}
            description={pin.description}
            pinColor={pin.pinColor}
          />
        ))}
      </MapView>
    </View>
  );
}

export function PoliceMapTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const rows = await api.get<CaseRow[]>('/cases');
          setCases(rows.filter((c) => c.status !== 'REUNITED'));
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  if (loading) return <Loading />;

  const withPin = cases.filter((c) => c.lastSeen).length;

  return (
    <Screen>
      <Title>Live map</Title>
      <Muted>
        Booths + {withPin} case pin(s) · red MISSING · yellow FOUND/MATCHED
      </Muted>
      <MapPanel cases={cases} />
      <Text style={styles.legend}>
        {BOOTH_PINS.map((p) => `${p.title} · ${p.description}`).join('  ·  ')}
      </Text>
      <Text style={styles.caseCount}>{cases.length} open case(s)</Text>
      <FlatList
        data={cases}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const tone = caseStatusColors(item.status);
          return (
            <Pressable
              onPress={() => navigation.navigate('PoliceCaseDetail', { caseId: item.id })}
              style={[styles.card, { backgroundColor: tone.bg, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={[styles.cardTitle, { color: tone.fg }]}>
                {item.name ?? item.memberUid}
              </Text>
              <Text style={{ color: tone.fg, fontWeight: '700' }}>{caseStatusLabel(item.status)}</Text>
              <Text>{item.lastSeenLabel ?? (item.lastSeen ? 'GPS last seen' : 'No pin yet')}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapFallback: {
    backgroundColor: '#D9E8F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  legend: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  caseCount: {
    fontWeight: '600',
    marginBottom: 8,
    color: colors.navy,
  },
  card: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
  },
});

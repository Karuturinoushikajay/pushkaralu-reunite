import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useMissingAlertPrefs } from '../../alerts/MissingAlertWatcher';
import { unlockAlertAudio } from '../../alerts/alertSound';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { Loading, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VolunteerHome'>;

type MissingAlert = {
  caseId: string;
  memberUid: string;
  displayName: string | null;
  ageBand: string | null;
  description: string | null;
  lastSeenLabel: string | null;
  distanceMeters: number | null;
  hasPhoto: boolean;
  photoUrl: string | null;
};

function initials(name: string | null, uid: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return uid.slice(0, 2).toUpperCase();
}

function PhotoAvatar({ item }: { item: MissingAlert }) {
  if (item.photoUrl) {
    return (
      <Image
        source={{ uri: item.photoUrl }}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border }}
      />
    );
  }
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.alert,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '800', fontSize: 18 }}>
        {initials(item.displayName, item.memberUid)}
      </Text>
    </View>
  );
}

export function VolunteerHomeScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const { muted, setMuted, testSound, soundStatus } = useMissingAlertPrefs();
  const [alerts, setAlerts] = useState<MissingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          let lng = 81.7795;
          let lat = 16.9846;
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({});
            lng = pos.coords.longitude;
            lat = pos.coords.latitude;
          }
          const res = await api.get<MissingAlert[]>(
            `/volunteer/alerts?lng=${lng}&lat=${lat}&radiusMeters=10000`,
          );
          setAlerts(Array.isArray(res) ? res : []);
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  return (
    <Screen>
      <Title>Duty zone · Missing alerts</Title>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        Open MISSING cases · name, ID, photo · sound when new nearby report
      </Text>
      <PrimaryButton
        label={muted ? 'Alert sound OFF' : 'Alert sound ON'}
        tone={muted ? 'outline' : 'amber'}
        onPress={() => {
          unlockAlertAudio();
          setMuted(!muted);
        }}
      />
      <PrimaryButton
        label="Test alert sound"
        tone="amber"
        onPress={() => setLocalStatus(testSound())}
      />
      {(localStatus || soundStatus) ? (
        <Text style={{ marginBottom: 8, fontWeight: '700', color: colors.navy }}>
          {localStatus ?? soundStatus}
        </Text>
      ) : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.caseId}
          ListEmptyComponent={<Text>No missing alerts right now</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('FindPerson')}
              style={{
                backgroundColor: colors.alertBg,
                padding: 12,
                borderRadius: 10,
                marginBottom: 10,
                flexDirection: 'row',
                gap: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <PhotoAvatar item={item} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: colors.alert, fontSize: 16 }}>
                  {item.displayName ?? 'Unknown'} · MISSING
                </Text>
                <Text style={{ fontWeight: '700', marginTop: 2 }}>ID: {item.memberUid}</Text>
                {item.ageBand ? (
                  <Text style={{ color: colors.muted }}>Age: {item.ageBand.replace(/_/g, ' ')}</Text>
                ) : null}
                <Text style={{ marginTop: 4 }}>
                  {item.lastSeenLabel ?? item.description ?? 'Last seen near ghat'}
                </Text>
                {item.distanceMeters != null ? (
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    ~{item.distanceMeters} m away
                  </Text>
                ) : null}
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>
                  {item.hasPhoto || item.photoUrl ? 'Photo on file' : 'No photo — use initials'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <PrimaryButton label="Register case" onPress={() => navigation.navigate('FindPerson')} />
      <PrimaryButton label="Scan wristband QR" tone="outline" onPress={() => navigation.navigate('ScanQr')} />
      <PrimaryButton label="SOS / need help" tone="alert" onPress={() => {}} />
      <PrimaryButton label="Log out" tone="outline" onPress={() => void logout()} />
    </Screen>
  );
}

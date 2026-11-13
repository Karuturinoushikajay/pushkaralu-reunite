import React, { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { api } from '../../api';
import { colors } from '../../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanQr'>;

function extractUid(raw: string): string {
  const text = raw.trim();
  // Prefer family-style UID if embedded in a longer payload.
  const match = text.toUpperCase().match(/[A-Z0-9]{2,8}-\d{1,3}/);
  if (match) return match[0];
  return text.toUpperCase();
}

export function ScanQrScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const handling = useRef(false);

  const lookup = useCallback(
    async (rawUid: string) => {
      const qrUid = extractUid(rawUid);
      if (!qrUid) {
        setError('No UID in QR');
        return;
      }
      setUid(qrUid);
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<{
          results: Array<{
            uid: string;
            name: string;
            familyCode: string;
            caseStatus: string | null;
          }>;
        }>('/search/pilgrims', { mode: 'qr', qrUid });
        const hit = res.results[0];
        if (!hit) {
          setError('No member for that QR UID');
          return;
        }
        navigation.replace('FamilyCall', { hit });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lookup failed');
      } finally {
        setLoading(false);
        handling.current = false;
      }
    },
    [navigation],
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (handling.current || loading) return;
      const data = result?.data?.trim();
      if (!data) return;
      handling.current = true;
      void lookup(data);
    },
    [loading, lookup],
  );

  const cameraSupported = Platform.OS !== 'web';

  return (
    <Screen style={{ padding: 0 }}>
      <View style={{ padding: 24, paddingBottom: 8 }}>
        <Title>Scan wristband QR</Title>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>
          Point the camera at the wristband QR, or enter the UID manually.
        </Text>
      </View>

      {cameraSupported ? (
        <View style={styles.cameraWrap}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Text style={{ marginBottom: 12, textAlign: 'center' }}>
                Camera permission is needed to scan wristbands.
              </Text>
              <PrimaryButton label="Allow camera" tone="amber" onPress={() => void requestPermission()} />
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={loading ? undefined : onBarcodeScanned}
              />
              <View style={styles.frame} pointerEvents="none" />
              <View style={styles.cameraActions}>
                <PrimaryButton
                  label={torch ? 'Torch off' : 'Torch on'}
                  tone="outline"
                  onPress={() => setTorch((v) => !v)}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            Live camera scan works on phone apps. On web, enter the UID below.
          </Text>
        </View>
      )}

      <View style={{ padding: 24 }}>
        <Field
          value={uid}
          onChangeText={setUid}
          placeholder="K7M2-03"
          autoCapitalize="characters"
        />
        <ErrorText message={error} />
        <PrimaryButton
          label={loading ? 'Looking up…' : 'Look up UID'}
          onPress={() => void lookup(uid)}
          disabled={loading || !uid.trim()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 280,
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.white,
  },
  frame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    borderWidth: 2,
    borderColor: colors.amber,
    borderRadius: 12,
  },
  cameraActions: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
});

import React, { useRef, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { ErrorText, Field, PrimaryButton, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMember'>;

function Label({ children }: { children: string }) {
  return <Text style={{ color: colors.muted, marginBottom: 6, marginTop: 4 }}>{children}</Text>;
}

export function AddMemberScreen({ navigation }: Props) {
  const { t } = useI18n();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [emergency, setEmergency] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openCamera() {
    setError(null);
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setError(t(I18N_KEYS.actionAllowCamera));
        return;
      }
    }
    setCameraOpen(true);
  }

  async function capturePhoto() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const shot = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        base64: true,
        skipProcessing: Platform.OS === 'android',
      });
      if (!shot?.base64) {
        setError(t(I18N_KEYS.errorPhotoRequired));
        return;
      }
      setPhotoUri(`data:image/jpeg;base64,${shot.base64}`);
      setCameraOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(I18N_KEYS.errorPhotoRequired));
    } finally {
      setCapturing(false);
    }
  }

  async function save() {
    const digits = aadhaar.replace(/\D/g, '');
    const ownPhone = phone.replace(/\D/g, '');
    const emergencyPhone = emergency.replace(/\D/g, '');

    if (!name.trim()) {
      setError(t(I18N_KEYS.errorNameRequired));
      return;
    }
    if (!address.trim()) {
      setError(t(I18N_KEYS.errorAddressRequired));
      return;
    }
    if (!emergencyPhone || emergencyPhone.length < 10) {
      setError(t(I18N_KEYS.errorEmergencyPhone));
      return;
    }
    if (ownPhone && ownPhone.length < 10) {
      setError(t(I18N_KEYS.errorOwnPhone));
      return;
    }
    if (digits && digits.length !== 12) {
      setError(t(I18N_KEYS.errorAadhaar));
      return;
    }
    if (!photoUri) {
      setError(t(I18N_KEYS.errorPhotoRequired));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/members', {
        name: name.trim(),
        ageBand: 'CHILD_6_8',
        address: address.trim(),
        ownPhone: ownPhone || undefined,
        emergencyPhone,
        aadhaarNumber: digits.length === 12 ? digits : undefined,
        minorGuardianConsent: true,
        photoKey: photoUri,
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (cameraOpen) {
    return (
      <Screen style={{ padding: 0, backgroundColor: '#000' }}>
        <View style={styles.cameraFull}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Text style={{ color: colors.white, marginBottom: 12, textAlign: 'center' }}>
                {t(I18N_KEYS.livePhotoNote)}
              </Text>
              <PrimaryButton
                label={t(I18N_KEYS.actionAllowCamera)}
                tone="amber"
                onPress={() => void requestPermission()}
              />
            </View>
          ) : (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
              <View style={styles.cameraChrome}>
                <Text style={styles.cameraHint}>{t(I18N_KEYS.livePhotoNote)}</Text>
                <PrimaryButton
                  label={capturing ? '…' : t(I18N_KEYS.actionTakePhoto)}
                  tone="amber"
                  disabled={capturing}
                  onPress={() => void capturePhoto()}
                />
                <PrimaryButton
                  label={t(I18N_KEYS.actionCancel)}
                  tone="outline"
                  onPress={() => setCameraOpen(false)}
                />
              </View>
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Title>{t(I18N_KEYS.addMemberTitle)}</Title>

        <Label>{t(I18N_KEYS.fieldLivePhoto)}</Label>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>{t(I18N_KEYS.livePhotoNote)}</Text>
        {photoUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 8 }}>
              {t(I18N_KEYS.addMemberPhotoCaptured)}
            </Text>
            <PrimaryButton
              label={t(I18N_KEYS.actionRetakePhoto)}
              tone="outline"
              onPress={() => void openCamera()}
            />
          </View>
        ) : (
          <PrimaryButton
            label={t(I18N_KEYS.actionTakePhoto)}
            tone="amber"
            onPress={() => void openCamera()}
          />
        )}

        <View>
          <Label>{t(I18N_KEYS.fieldNameRequired)}</Label>
          <Field value={name} onChangeText={setName} placeholder={t(I18N_KEYS.placeholderFullName)} />
          <Label>{t(I18N_KEYS.fieldOwnPhoneOptional)}</Label>
          <Field
            value={phone}
            onChangeText={setPhone}
            placeholder={t(I18N_KEYS.placeholderMobile10)}
            keyboardType="phone-pad"
          />
          <Label>{t(I18N_KEYS.fieldAddressRequired)}</Label>
          <Field
            value={address}
            onChangeText={setAddress}
            placeholder={t(I18N_KEYS.placeholderVillageCity)}
          />
          <Label>{t(I18N_KEYS.fieldAadhaarOptionalChild)}</Label>
          <Field
            value={aadhaar}
            onChangeText={setAadhaar}
            placeholder={t(I18N_KEYS.placeholderAadhaar12)}
            keyboardType="number-pad"
            maxLength={12}
          />
          <Label>{t(I18N_KEYS.fieldEmergencyPhoneRequired)}</Label>
          <Field
            value={emergency}
            onChangeText={setEmergency}
            placeholder={t(I18N_KEYS.placeholderMobile10)}
            keyboardType="phone-pad"
          />
        </View>
        <ErrorText message={error} />
        <PrimaryButton
          label={loading ? '…' : t(I18N_KEYS.actionAddMember)}
          onPress={() => void save()}
          disabled={loading}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraFull: {
    flex: 1,
    minHeight: 480,
    backgroundColor: '#000',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cameraChrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraHint: {
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  previewWrap: {
    marginBottom: 12,
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#E8EEF4',
  },
});
